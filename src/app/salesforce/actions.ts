
'use server';

import { doc, getDoc, updateDoc, arrayUnion, increment, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Problem } from '@/types';

type SalesforceTokenResponse = {
  access_token: string;
  instance_url: string;
  refresh_token?: string; // Refresh token is not always returned
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

    // Refresh token if it's older than ~55 minutes
    const tokenAgeMinutes = (Date.now() - auth.issuedAt) / (1000 * 60);
    if (tokenAgeMinutes > 55) {
        const loginUrl = process.env.SFDC_LOGIN_URL || 'https://login.salesforce.com';
        const clientId = process.env.NEXT_PUBLIC_SFDC_CLIENT_ID;

        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('client_id', clientId!);
        params.append('refresh_token', auth.refreshToken);

        const response = await fetch(`${loginUrl}/services/oauth2/token`, {
            method: 'POST',
            body: params,
        });

        const data: SalesforceTokenResponse = await response.json();

        if (!response.ok) {
            // If refresh fails, mark connection as invalid
            await updateDoc(userDocRef, { "sfdcAuth.connected": false });
            throw new Error('Failed to refresh Salesforce token. Please reconnect.');
        }

        const newAuth: Partial<SfdcAuth> = {
            accessToken: data.access_token,
            issuedAt: parseInt(data.issued_at, 10),
            // Salesforce might issue a new refresh token
            ...(data.refresh_token && { refreshToken: data.refresh_token }),
        };

        await updateDoc(userDocRef, { sfdcAuth: { ...auth, ...newAuth } });
        auth = { ...auth, ...newAuth };
    }
    
    return auth;
}

// Utility for making authenticated API calls
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
    // For DELETE or PATCH requests, response body might be empty
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


const getClassName = (code: string) => code.match(/(?:class|trigger)\s+([A-Za-z0-9_]+)/)?.[1];
const POINTS_MAP = { Easy: 10, Medium: 25, Hard: 50 };

export async function getSalesforceAccessToken(code: string, codeVerifier: string, userId: string) {
  const loginUrl = process.env.SFDC_LOGIN_URL || 'https://login.salesforce.com';
  const clientId = process.env.NEXT_PUBLIC_SFDC_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_HOST}/salesforce-callback`;

  if (!clientId) {
    return { success: false, error: 'Salesforce client ID is not configured.' };
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('client_id', clientId);
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

type ApexExecutionResult = {
    compiled: boolean;
    compileProblem: string | null;
    success: boolean;
    exceptionMessage: string | null;
    exceptionStackTrace: string | null;
    logs: string;
}

export async function executeApexCode(userId: string, code: string) {
    const auth = await getSfdcConnection(userId);
    const endpoint = `/services/data/v59.0/tooling/executeAnonymous/?anonymousBody=${encodeURIComponent(code)}`;
    try {
        const result: ApexExecutionResult = await sfdcFetch(auth, endpoint, { method: 'GET' });
        return { success: true, result };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}

export async function executeQuery(userId: string, query: string) {
    const auth = await getSfdcConnection(userId);
    const endpoint = `/services/data/v59.0/query?q=${encodeURIComponent(query)}`;
    try {
        const result = await sfdcFetch(auth, endpoint, { method: 'GET' });
        return { success: true, result };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}

type SubmissionResult = { success: boolean, message: string, details?: string, pointsAwarded?: number };

export async function submitApexSolution(userId: string, problem: Problem, userCode: string): Promise<SubmissionResult> {
    try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().solvedProblems?.includes(problem.id)) {
            return { success: true, message: "You have already solved this problem.", pointsAwarded: 0 };
        }

        const auth = await getSfdcConnection(userId);
        
        const objectType = problem.metadataType === 'Class' ? 'ApexClass' : 'ApexTrigger';
        const mainObjectName = getClassName(userCode);
        const testObjectName = getClassName(problem.testcases);
        
        if (!mainObjectName || !testObjectName) {
            return { success: false, message: 'Could not determine class/trigger names from code.' };
        }

        if (mainObjectName === testObjectName) {
            return { success: false, message: 'The solution class/trigger name cannot be the same as the test class name.' };
        }
        
        // --- Upsert Logic for Apex Code and Test Class using a Batch ---
        const batch = writeBatch(db);

        // --- Deploy Main Object (Upsert) ---
        let existingRecord = await findToolingApiRecord(auth, objectType, mainObjectName);
        if (existingRecord) {
            await sfdcFetch(auth, `/services/data/v59.0/tooling/sobjects/${objectType}/${existingRecord.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ Body: userCode, ApiVersion: 59.0 }),
            });
        } else {
            await createToolingApiRecord(auth, objectType, mainObjectName, userCode);
        }

        // --- Deploy Test Class (Upsert) and get ID ---
        let testClassId;
        let existingTest = await findToolingApiRecord(auth, 'ApexClass', testObjectName);
        if (existingTest) {
            await sfdcFetch(auth, `/services/data/v59.0/tooling/sobjects/ApexClass/${existingTest.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ Body: problem.testcases, ApiVersion: 59.0 }),
            });
            testClassId = existingTest.id;
        } else {
            const newTestRecord = await createToolingApiRecord(auth, 'ApexClass', testObjectName, problem.testcases);
            testClassId = newTestRecord.id;
        }
        
        if (!testClassId) {
            return { success: false, message: 'Could not determine test class ID after deployment.' };
        }

        // --- Run Tests ---
        const testRunResult = await sfdcFetch(auth, '/services/data/v59.0/tooling/runTestsAsynchronous/', {
            method: 'POST',
            body: JSON.stringify({ classids: testClassId })
        });
        const apexTestRunId = testRunResult;

        // Poll for results
        let testResult;
        for (let i = 0; i < 20; i++) { // Poll for up to 20 seconds
            await new Promise(resolve => setTimeout(resolve, 1000));
            const query = `SELECT Status, ApexClassId, Message, MethodName, Outcome, StackTrace FROM ApexTestResult WHERE AsyncApexJobId = '${apexTestRunId}'`;
            const result = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=${encodeURIComponent(query)}`);
            if (result.records.length > 0 && ['Completed', 'Failed', 'Aborted'].includes(result.records[0].Status)) {
                testResult = result.records;
                break;
            }
        }
        
        if (!testResult) {
            return { success: false, message: "Test run timed out." };
        }

        const failedTest = testResult.find((r: any) => r.Outcome !== 'Pass');

        if (failedTest) {
             return { success: false, message: `Test Failed: ${failedTest.MethodName}`, details: `${failedTest.Message}\n${failedTest.StackTrace}` };
        }

        // --- Success ---
        const points = POINTS_MAP[problem.difficulty];
        batch.update(userDocRef, {
            points: increment(points),
            solvedProblems: arrayUnion(problem.id)
        });
        
        await batch.commit();

        return { success: true, message: `All tests passed! You've earned ${points} points.`, pointsAwarded: points };

    } catch (error) {
        console.error('Submit Apex Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, message: 'An error occurred during submission.', details: errorMessage };
    }
}
