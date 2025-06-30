
'use server';

import { doc, getDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Problem } from '@/types';

type SalesforceTokenResponse = {
  access_token: string;
  instance_url: string;
  refresh_token?: string;
  issued_at: string;
  id_token: string;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
};

type SfdcAuth = NonNullable<User['sfdcAuth']>;

async function getSfdcConnection(userId: string): Promise<SfdcAuth> {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists() || !userDoc.data().sfdcAuth?.connected) {
        throw new Error('Salesforce account not connected.');
    }

    let auth = userDoc.data().sfdcAuth as SfdcAuth;

    const tokenAgeMinutes = (Date.now() - auth.issuedAt) / (1000 * 60);
    // Refresh if token is older than 55 minutes
    if (tokenAgeMinutes > 55) { 
        const loginUrl = process.env.SFDC_LOGIN_URL || 'https://login.salesforce.com';
        const clientId = process.env.NEXT_PUBLIC_SFDC_CLIENT_ID;
        const clientSecret = process.env.SFDC_CLIENT_SECRET;

        if(!clientId || !clientSecret) {
             throw new Error('Salesforce client credentials are not configured on the server.');
        }

        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        params.append('refresh_token', auth.refreshToken);

        const response = await fetch(`${loginUrl}/services/oauth2/token`, {
            method: 'POST',
            body: params,
        });

        const data: SalesforceTokenResponse = await response.json();

        if (!response.ok) {
            await updateDoc(userDocRef, { "sfdcAuth.connected": false });
            throw new Error('Failed to refresh Salesforce token. Please reconnect.');
        }

        const newAuth: Partial<SfdcAuth> = {
            accessToken: data.access_token,
            issuedAt: parseInt(data.issued_at, 10),
            ...(data.refresh_token && { refreshToken: data.refresh_token }),
        };

        await updateDoc(userDocRef, { sfdcAuth: { ...auth, ...newAuth } });
        auth = { ...auth, ...newAuth };
    }
    
    return auth;
}

async function sfdcFetch(auth: SfdcAuth, path: string, options: RequestInit = {}) {
    const endpoint = `${auth.instanceUrl}${path}`;
    const response = await fetch(endpoint, {
        ...options,
        headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    if (!response.ok) {
        const errorBody = await response.json();
        const errorMessage = Array.isArray(errorBody) ? errorBody[0]?.message : (errorBody.message || 'An unknown Salesforce API error occurred.');
        throw new Error(errorMessage);
    }
    if (response.status === 204) {
        return null;
    }
    return response.json();
}

async function findToolingApiRecord(auth: SfdcAuth, objectType: 'ApexClass' | 'ApexTrigger', name: string) {
    const query = `SELECT Id FROM ${objectType} WHERE Name = '${name}'`;
    const result = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=${encodeURIComponent(query)}`);
    return result.records[0] || null;
}

async function createToolingApiRecord(auth: SfdcAuth, objectType: 'ApexClass' | 'ApexTrigger', name: string, body: string) {
    return sfdcFetch(auth, `/services/data/v59.0/tooling/sobjects/${objectType}/`, {
        method: 'POST',
        body: JSON.stringify({ Name: name, Body: body, ApiVersion: 59.0 }),
    });
}

async function deleteToolingApiRecord(auth: SfdcAuth, objectType: 'ApexClass' | 'ApexTrigger', id: string) {
    return sfdcFetch(auth, `/services/data/v59.0/tooling/sobjects/${objectType}/${id}`, {
        method: 'DELETE',
    });
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getClassName = (code: string) => code.match(/(?:class|trigger)\s+([A-Za-z0-9_]+)/)?.[1];
const POINTS_MAP: { [key: string]: number } = { Easy: 10, Medium: 25, Hard: 50 };

export async function getSalesforceAccessToken(code: string, codeVerifier: string, userId: string) {
  const loginUrl = process.env.SFDC_LOGIN_URL || 'https://login.salesforce.com';
  const clientId = process.env.NEXT_PUBLIC_SFDC_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_HOST}/salesforce-callback`;
  const clientSecret = process.env.SFDC_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { success: false, error: 'Salesforce client credentials are not configured.' };
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('redirect_uri', redirectUri);
  params.append('code_verifier', codeVerifier);

  try {
    const response = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data: SalesforceTokenResponse = await response.json();
    
    if (!response.ok) {
      console.error('Salesforce Token Exchange Error:', data);
      throw new Error(data.error_description || 'Failed to fetch access token.');
    }
    
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      sfdcAuth: {
        accessToken: data.access_token,
        instanceUrl: data.instance_url,
        refreshToken: data.refresh_token,
        issuedAt: parseInt(data.issued_at, 10),
        connected: true,
      },
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, error: errorMessage };
  }
}

type SubmissionResult = { success: boolean, message: string, details?: string };

export async function submitApexSolution(userId: string, problem: Problem, userCode: string): Promise<SubmissionResult> {
    try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().solvedProblems?.includes(problem.id)) {
            return { success: true, message: "You have already solved this problem." };
        }

        const auth = await getSfdcConnection(userId);
        
        const objectType = problem.metadataType === 'Class' ? 'ApexClass' : 'ApexTrigger';
        const mainObjectName = getClassName(userCode);
        const testObjectName = getClassName(problem.testcases);
        
        if (!mainObjectName || !testObjectName) {
            return { success: false, message: 'Could not determine class/trigger names from code.' };
        }
        
        // Clean up previous versions of the class/trigger and test class
        let existingRecord = await findToolingApiRecord(auth, objectType, mainObjectName);
        if (existingRecord) {
            await deleteToolingApiRecord(auth, objectType, existingRecord.id);
            await sleep(1000); 
        }
        await createToolingApiRecord(auth, objectType, mainObjectName, userCode);

        let existingTest = await findToolingApiRecord(auth, 'ApexClass', testObjectName);
        if (existingTest) {
            await deleteToolingApiRecord(auth, 'ApexClass', existingTest.id);
            await sleep(1000);
        }
        const newTestRecord = await createToolingApiRecord(auth, 'ApexClass', testObjectName, problem.testcases);
        const testClassId = newTestRecord.id;

        // Run tests asynchronously
        const testRunResult = await sfdcFetch(auth, '/services/data/v59.0/tooling/runTestsAsynchronous/', {
            method: 'POST',
            body: JSON.stringify({ classids: testClassId })
        });
        const apexTestRunId = testRunResult;

        // Poll for test results
        let testResult;
        for (let i = 0; i < 20; i++) { // Poll for up to 20 seconds
            await sleep(1000);
            const query = `SELECT Status, ApexClassId, Message, MethodName, Outcome, StackTrace FROM ApexTestResult WHERE AsyncApexJobId = '${apexTestRunId}'`;
            const result = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=${encodeURIComponent(query)}`);
            // Check if all tests for the class have completed
            if (result.records.length > 0 && result.records.every((r: any) => ['Completed', 'Failed', 'Aborted'].includes(r.Status))) {
                testResult = result.records;
                break;
            }
        }
        
        if (!testResult) {
            return { success: false, message: "Test run timed out." };
        }

        const failedTest = testResult.find((r: any) => r.Outcome !== 'Pass');

        if (failedTest) {
             return { success: false, message: `Test Failed: ${failedTest.MethodName}`, details: `${failedTest.Message}\n${failedTest.StackTrace || ''}` };
        }

        const points = POINTS_MAP[problem.difficulty] || 0;
        await updateDoc(userDocRef, {
            points: increment(points),
            solvedProblems: arrayUnion(problem.id)
        });

        return { success: true, message: `All tests passed! You've earned ${points} points.` };

    } catch (error) {
        console.error('Submit Apex Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, message: 'An error occurred during submission.', details: errorMessage };
    }
}
