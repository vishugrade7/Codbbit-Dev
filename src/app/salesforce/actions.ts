
'use server';

import { doc, getDoc, updateDoc, arrayUnion, increment, setDoc } from 'firebase/firestore';
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
type SubmissionResult = { success: boolean, message: string, details?: string };
const POINTS_MAP: { [key: string]: number } = { Easy: 10, Medium: 25, Hard: 50 };
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const getClassName = (code: string) => code.match(/(?:class|trigger)\s+([A-Za-z0-9_]+)/i)?.[1];


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
    // No content for DELETE requests
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

async function createToolingApiRecord(auth: SfdcAuth, objectType: 'ApexClass' | 'ApexTrigger', name: string, body: string, triggerSObject?: string) {
    const requestBody: { Name: string; Body: string; ApiVersion: number; TableEnumOrId?: string } = {
        Name: name,
        Body: body,
        ApiVersion: 59.0,
    };

    if (objectType === 'ApexTrigger') {
        if (!triggerSObject) {
            throw new Error('The SObject for the trigger was not specified in the problem data.');
        }
        requestBody.TableEnumOrId = triggerSObject;
    }

    return sfdcFetch(auth, `/services/data/v59.0/tooling/sobjects/${objectType}/`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
    });
}

async function waitForCompilation(log: string[], auth: SfdcAuth, objectType: 'ApexClass' | 'ApexTrigger', recordId: string): Promise<{ success: boolean; message?: string }> {
    for (let i = 0; i < 60; i++) { // 60 seconds timeout
        await sleep(1000);
        log.push(`> Polling compilation status... (Attempt ${i + 1})`);
        const query = `SELECT Status, IsValid, CompileProblem FROM ${objectType} WHERE Id = '${recordId}'`;
        try {
            const result = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=${encodeURIComponent(query)}`);
            if (result.records.length > 0) {
                const record = result.records[0];
                if (record.Status === 'Active') {
                    return { success: true };
                }
                if (record.Status === 'Invalid' || record.Status === 'Error' || !record.IsValid) {
                    const errorMessage = `Compilation failed. Status: ${record.Status}. Problem: ${record.CompileProblem || 'Unknown'}`;
                    return { success: false, message: errorMessage };
                }
            }
        } catch (error) {
            console.warn(`Polling query failed for ${recordId}, will retry. Error:`, error);
        }
    }
    return { success: false, message: `Timed out waiting for ${objectType} to compile.` };
}


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
    await setDoc(userDocRef, {
      sfdcAuth: {
        accessToken: data.access_token,
        instanceUrl: data.instance_url,
        refreshToken: data.refresh_token,
        issuedAt: parseInt(data.issued_at, 10),
        connected: true,
      },
    }, { merge: true });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, error: errorMessage };
  }
}

async function deployMetadata(log: string[], auth: SfdcAuth, objectType: 'ApexClass' | 'ApexTrigger', name: string, body: string, triggerSObject?: string): Promise<string> {
    log.push(`\n--- Deploying ${objectType}: ${name} ---`);
    const existingRecord = await findToolingApiRecord(auth, objectType, name);
    
    if (existingRecord) {
        log.push(`> Found existing record with ID: ${existingRecord.Id}. Deleting...`);
        await sfdcFetch(auth, `/services/data/v59.0/tooling/sobjects/${objectType}/${existingRecord.Id}`, { method: 'DELETE' });
        log.push(`> Deletion successful.`);
    }

    log.push(`> Creating new ${objectType}...`);
    const newRecord = await createToolingApiRecord(auth, objectType, name, body, triggerSObject);
    log.push(`> Creation successful. Record ID: ${newRecord.id}.`);
    
    log.push(`> Waiting for compilation...`);
    const compilationResult = await waitForCompilation(log, auth, objectType, newRecord.id);

    if (!compilationResult.success) {
        throw new Error(compilationResult.message || `The ${objectType} failed to compile.`);
    }

    log.push(`> Compilation successful.`);
    return newRecord.id;
}


export async function submitApexSolution(userId: string, problem: Problem, userCode: string): Promise<SubmissionResult> {
    const log: string[] = [];
    
    try {
        log.push("Starting submission...");
        
        // --- VALIDATION STEP ---
        const codeTypeKeywordMatch = userCode.match(/^\s*(?:public\s+|global\s+)?(class|trigger)\s+/i);
        const codeTypeKeyword = codeTypeKeywordMatch ? codeTypeKeywordMatch[1].toLowerCase() : null;
        const problemTypeKeyword = problem.metadataType.toLowerCase();

        if (codeTypeKeyword && codeTypeKeyword !== problemTypeKeyword) {
            const userFriendlyCodeType = codeTypeKeyword.charAt(0).toUpperCase() + codeTypeKeyword.slice(1);
            const errorMessage = `Code Mismatch: This problem expects an Apex ${problem.metadataType}, but the submitted code appears to be an Apex ${userFriendlyCodeType}. Please correct your code.`;
            log.push(`\n--- ERROR ---`);
            log.push(errorMessage);
            return { success: false, message: 'Code submission failed validation.', details: log.join('\n') };
        }
        // --- END VALIDATION ---

        const objectType = problem.metadataType === 'Class' ? 'ApexClass' : 'ApexTrigger';
        if (objectType === 'ApexTrigger' && !problem.triggerSObject) {
            const msg = "This trigger problem is missing its associated SObject. An administrator needs to update the problem configuration.";
            return { success: false, message: 'Problem Configuration Error', details: msg };
        }

        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().solvedProblems?.includes(problem.id)) {
            return { success: true, message: "You have already solved this problem.", details: "You have already solved this problem." };
        }

        log.push("> Connecting to Salesforce...");
        const auth = await getSfdcConnection(userId);
        log.push("> Connection successful.");
        
        const mainObjectName = getClassName(userCode);
        const testObjectName = getClassName(problem.testcases);
        
        if (!mainObjectName || !testObjectName) {
            throw new Error('Could not determine class/trigger names from the provided code.');
        }

        const mainObjectId = await deployMetadata(log, auth, objectType, mainObjectName, userCode, problem.triggerSObject);
        
        await sleep(2000); // Wait after main object compilation to avoid platform conflicts

        const testClassId = await deployMetadata(log, auth, 'ApexClass', testObjectName, problem.testcases);

        log.push("\n--- Running Tests ---");
        log.push(`> Initiating test run for class ID: ${testClassId}`);
        const testRunResult = await sfdcFetch(auth, '/services/data/v59.0/tooling/runTestsAsynchronous/', {
            method: 'POST',
            body: JSON.stringify({ classids: testClassId })
        });
        const apexTestRunId = testRunResult;
        log.push(`> Test run queued with ID: ${apexTestRunId}`);

        log.push("> Polling for test job completion...");
        let jobStatus;
        for (let i = 0; i < 30; i++) {
            await sleep(1000);
            const jobQuery = `SELECT Status FROM AsyncApexJob WHERE Id = '${apexTestRunId}'`;
            const jobResult = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=${encodeURIComponent(jobQuery)}`);
            if (jobResult.records.length > 0) {
                jobStatus = jobResult.records[0].Status;
                log.push(`> Job status: ${jobStatus}`);
                if (['Completed', 'Failed', 'Aborted'].includes(jobStatus)) break;
            }
        }

        if (jobStatus !== 'Completed') {
            throw new Error(`Test run did not complete successfully. Final status: ${jobStatus || 'Timed Out'}`);
        }
        
        log.push("> Test job completed. Fetching results...");
        const resultQuery = `SELECT ApexClassId, Message, MethodName, Outcome, StackTrace FROM ApexTestResult WHERE AsyncApexJobId = '${apexTestRunId}'`;
        const testResultData = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=${encodeURIComponent(resultQuery)}`);
        
        const testResults = testResultData.records;
        if (!testResults || testResults.length === 0) {
             throw new Error("Test run completed, but no test results were found.");
        }

        const failedTest = testResults.find((r: any) => r.Outcome !== 'Pass');
        if (failedTest) {
             throw new Error(`Test Failed: ${failedTest.MethodName}\n\n${failedTest.Message}\n${failedTest.StackTrace || ''}`);
        }

        log.push("> All tests passed!");

        log.push("\n--- Checking Code Coverage ---");
        const coverageQuery = `SELECT NumLinesCovered, NumLinesUncovered FROM ApexCodeCoverageAggregate WHERE ApexClassOrTriggerId = '${mainObjectId}'`;
        const coverageResult = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=${encodeURIComponent(coverageQuery)}`);
        
        if (coverageResult.records && coverageResult.records.length > 0) {
            const coverage = coverageResult.records[0];
            const covered = coverage.NumLinesCovered;
            const total = coverage.NumLinesCovered + coverage.NumLinesUncovered;
            const percentage = total > 0 ? ((covered / total) * 100).toFixed(2) : '100.00';
            log.push(`> Coverage: ${percentage}% (${covered}/${total} lines covered).`);
        } else {
            log.push("> Could not retrieve code coverage information.");
        }

        const points = POINTS_MAP[problem.difficulty] || 0;
        log.push(`\nCongratulations! You've earned ${points} points.`);
        await updateDoc(userDocRef, {
            points: increment(points),
            solvedProblems: arrayUnion(problem.id)
        });
        
        return { success: true, message: `All tests passed! You've earned ${points} points.`, details: log.join('\n') };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        log.push(`\n--- ERROR ---`);
        log.push(errorMessage);
        return { success: false, message: 'An error occurred during submission.', details: log.join('\n') };
    }
}
