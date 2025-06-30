
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
        console.log("Salesforce token is old, attempting refresh...");
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
        
        console.log("Salesforce token refreshed successfully.");
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
    console.log(`Executing Tooling API query: ${query}`);
    try {
        const result = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=${encodeURIComponent(query)}`);
        console.log(`Query result for ${name}:`, JSON.stringify(result, null, 2));
        return result.records[0] || null;
    } catch (error) {
        console.error(`Error finding Tooling API record for ${name}:`, error);
        throw error;
    }
}

async function createToolingApiRecord(auth: SfdcAuth, objectType: 'ApexClass' | 'ApexTrigger', name: string, body: string) {
    console.log(`Creating new ${objectType} record named: ${name}`);
    return sfdcFetch(auth, `/services/data/v59.0/tooling/sobjects/${objectType}/`, {
        method: 'POST',
        body: JSON.stringify({ Name: name, Body: body, ApiVersion: 59.0 }),
    });
}

async function upsertToolingApiRecord(auth: SfdcAuth, objectType: 'ApexClass' | 'ApexTrigger', name: string, body: string) {
    console.log(`Upserting ${objectType} named: ${name}`);
    const record = await findToolingApiRecord(auth, objectType, name);
    if (record?.Id) {
        console.log(`Found existing record for ${name} with ID: ${record.Id}. Updating it.`);
        // Update existing record
        await sfdcFetch(auth, `/services/data/v59.0/tooling/sobjects/${objectType}/${record.Id}`, {
            method: 'PATCH',
            body: JSON.stringify({ Body: body, ApiVersion: 59.0 }),
        });
        console.log(`Successfully updated ${name}.`);
        return record;
    } else {
        console.log(`No existing record found for ${name}. Creating a new one.`);
        // Create new record
        const newRecord = await createToolingApiRecord(auth, objectType, name, body);
        console.log(`Successfully created ${name}.`);
        return newRecord;
    }
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
    console.log(`\n--- Starting Apex Solution Submission for user ${userId}, problem ${problem.id} ---`);
    try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().solvedProblems?.includes(problem.id)) {
            console.log("Problem already solved by user. Exiting.");
            return { success: true, message: "You have already solved this problem." };
        }

        console.log("Getting SFDC connection...");
        const auth = await getSfdcConnection(userId);
        console.log("SFDC connection successful.");
        
        const objectType = problem.metadataType === 'Class' ? 'ApexClass' : 'ApexTrigger';
        const mainObjectName = getClassName(userCode);
        const testObjectName = getClassName(problem.testcases);
        
        console.log(`Determined metadata type: ${objectType}`);
        console.log(`Extracted main object name: ${mainObjectName}`);
        console.log(`Extracted test object name: ${testObjectName}`);

        if (!mainObjectName || !testObjectName) {
            console.error('Could not determine class/trigger names from code.');
            return { success: false, message: 'Could not determine class/trigger names from code.' };
        }
        
        // Upsert the main class/trigger and the test class.
        console.log("\n--- Upserting main user code ---");
        await upsertToolingApiRecord(auth, objectType, mainObjectName, userCode);
        console.log("--- Finished upserting main user code ---\n");
        
        console.log("\n--- Upserting test class ---");
        const testRecord = await upsertToolingApiRecord(auth, 'ApexClass', testObjectName, problem.testcases);
        console.log("--- Finished upserting test class ---\n");

        if (!testRecord?.Id) {
            console.error('Failed to create or update test class in Salesforce.');
            return { success: false, message: 'Failed to create or update test class in Salesforce.' };
        }
        const testClassId = testRecord.Id;
        console.log(`Test class ID to be used for test run: ${testClassId}`);

        // Run tests asynchronously
        console.log("Requesting asynchronous test run...");
        const testRunResult = await sfdcFetch(auth, '/services/data/v59.0/tooling/runTestsAsynchronous/', {
            method: 'POST',
            body: JSON.stringify({ classids: testClassId })
        });
        const apexTestRunId = testRunResult;
        console.log(`Asynchronous test run initiated with ID: ${apexTestRunId}`);

        // Poll for test run completion
        console.log("Polling for test job completion...");
        let jobStatus;
        for (let i = 0; i < 30; i++) { // Poll for up to 30 seconds
            await sleep(1000);
            console.log(`Polling job status attempt ${i + 1}/30...`);
            const jobQuery = `SELECT Status FROM AsyncApexJob WHERE Id = '${apexTestRunId}'`;
            const jobResult = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=${encodeURIComponent(jobQuery)}`);
            
            if (jobResult.records.length > 0) {
                jobStatus = jobResult.records[0].Status;
                console.log(`Current job status: ${jobStatus}`);
                if (['Completed', 'Failed', 'Aborted'].includes(jobStatus)) {
                    break;
                }
            }
        }

        if (jobStatus !== 'Completed') {
            const message = `Test run did not complete successfully. Final status: ${jobStatus || 'Timed Out'}`;
            console.error(message);
            return { success: false, message };
        }
        
        console.log("Test job completed. Fetching results...");
        const resultQuery = `SELECT ApexClassId, Message, MethodName, Outcome, StackTrace FROM ApexTestResult WHERE AsyncApexJobId = '${apexTestRunId}'`;
        const testResultData = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=${encodeURIComponent(resultQuery)}`);
        
        const testResults = testResultData.records;
        console.log(`Test results received:`, JSON.stringify(testResults, null, 2));

        if (!testResults || testResults.length === 0) {
             console.error("No test results were found after a completed test run.");
             return { success: false, message: "Test run completed, but no test results were found." };
        }

        const failedTest = testResults.find((r: any) => r.Outcome !== 'Pass');

        if (failedTest) {
             console.error("A test case failed:", failedTest);
             return { success: false, message: `Test Failed: ${failedTest.MethodName}`, details: `${failedTest.Message}\n${failedTest.StackTrace || ''}` };
        }

        console.log("All tests passed successfully!");
        const points = POINTS_MAP[problem.difficulty] || 0;
        console.log(`Awarding ${points} points to user ${userId}.`);
        await updateDoc(userDocRef, {
            points: increment(points),
            solvedProblems: arrayUnion(problem.id)
        });
        
        console.log("User data updated in Firestore.");
        return { success: true, message: `All tests passed! You've earned ${points} points.` };

    } catch (error) {
        console.error('Submit Apex Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, message: 'An error occurred during submission.', details: errorMessage };
    } finally {
        console.log(`--- Finished Apex Solution Submission for user ${userId} ---`);
    }
}
