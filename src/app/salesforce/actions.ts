

'use server';

import { doc, getDoc, updateDoc, runTransaction, serverTimestamp, Timestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Problem, SolvedProblemDetail, Badge } from '@/types';


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
type SubmissionResult = { success: boolean, message: string, details?: string, coverage?: { covered: number[], uncovered: number[] } };
const POINTS_MAP: { [key: string]: number } = { Easy: 5, Medium: 10, Hard: 15 };
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const getClassName = (code: string) => code.match(/(?:class|trigger)\s+([A-Za-z0-9_]+)/i)?.[1];

const getFormattedDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};


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
        let errorMessage;

        if (Array.isArray(errorBody) && errorBody.length > 0) {
            const firstError = errorBody[0];
            errorMessage = firstError.message || 'An unknown Salesforce API error occurred.';
            // Check for lineNumber and columnNumber for compilation errors
            if (firstError.lineNumber && firstError.columnNumber) {
                errorMessage += ` (Line: ${firstError.lineNumber}, Column: ${firstError.columnNumber})`;
            }
        } else if (errorBody.message) {
            errorMessage = errorBody.message;
        } else {
            errorMessage = 'An unknown Salesforce API error occurred.';
        }
        
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
    }, { merge: true });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { success: false, error: errorMessage };
  }
}

async function deployMetadata(log: string[], auth: SfdcAuth, objectType: 'ApexClass' | 'ApexTrigger', name: string, body: string, triggerSObject?: string): Promise<string> {
    const existingRecord = await findToolingApiRecord(auth, objectType, name);
    
    if (existingRecord) {
        try {
            await sfdcFetch(auth, `/services/data/v59.0/tooling/sobjects/${objectType}/${existingRecord.Id}`, { method: 'DELETE' });
        } catch (e: any) {
            // Suppress error, as it might be from a failed previous run
        }
    }

    const newRecord = await createToolingApiRecord(auth, objectType, name, body, triggerSObject);
    return newRecord.id;
}

async function _awardPointsAndLogProgress(log: string[], userId: string, problem: Problem): Promise<string> {
    const userDocRef = doc(db, "users", userId);
    const pointsToAward = POINTS_MAP[problem.difficulty] || 0;
    const categoryName = problem.categoryName || "Uncategorized";

    try {
        let awardedBadges: string[] = [];

        const badgesCollectionRef = collection(db, 'badges');
        const badgesSnapshot = await getDocs(badgesCollectionRef);
        const badgesToAward = badgesSnapshot.docs.map(doc => doc.data() as Omit<Badge, 'id'>);

        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) {
                throw new Error("User document not found.");
            }
            const userData = userDoc.data() as User;

            const solvedProblems = userData.solvedProblems || {};
            if (solvedProblems[problem.id]) {
                log.push("\n> Problem already solved. No new points awarded.");
                return; 
            }
            
            log.push(`\n> Congratulations! Awarding ${pointsToAward} points.`);
            
            // --- Update Stats ---
            const newPoints = (userData.points || 0) + pointsToAward;

            const dsaStats = userData.dsaStats || { Easy: 0, Medium: 0, Hard: 0 };
            dsaStats[problem.difficulty] = (dsaStats[problem.difficulty] || 0) + 1;
            
            const categoryPoints = userData.categoryPoints || {};
            categoryPoints[categoryName] = (categoryPoints[categoryName] || 0) + pointsToAward;

            const today = getFormattedDate(new Date());
            const submissionHeatmap = userData.submissionHeatmap || {};
            submissionHeatmap[today] = (submissionHeatmap[today] || 0) + 1;

            solvedProblems[problem.id] = {
                solvedAt: serverTimestamp(),
                points: pointsToAward,
                difficulty: problem.difficulty,
                title: problem.title,
            };
            const newTotalSolved = Object.keys(solvedProblems).length;

            // --- Streak Logic ---
            let currentStreak = userData.currentStreak || 0;
            let maxStreak = userData.maxStreak || 0;
            const lastSolvedDate = userData.lastSolvedDate;

            if (lastSolvedDate !== today) {
                const yesterday = getFormattedDate(new Date(Date.now() - 864e5));
                if (lastSolvedDate === yesterday) {
                    currentStreak++;
                } else {
                    currentStreak = 1;
                }
            }
            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
            }
            
            // --- Badge Awarding Logic ---
            const newAchievements = { ...(userData.achievements || {}) };
            const categoryCounts: { [key: string]: number } = {};
            // Re-fetch solved problems inside transaction to count categories correctly
            const currentSolvedProblems = userData.solvedProblems || {};
            const allProblemsDoc = await getDoc(doc(db, "problems", "Apex"));
            const allProblemsData = allProblemsDoc.data()?.Category as any;
            
            if (allProblemsData) {
                Object.values(currentSolvedProblems).forEach((p: SolvedProblemDetail) => {
                    // Find the original problem to get its category
                    for (const catName in allProblemsData) {
                        const foundProblem = allProblemsData[catName].Questions.find((q: Problem) => q.title === p.title);
                        if (foundProblem) {
                            categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
                            break;
                        }
                    }
                });
                // Add the current problem being solved
                categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
            }


            for (const badge of badgesToAward) {
                if (!newAchievements[badge.name]) { // Check if badge is not already earned
                    const criteria = badge;
                    let earned = false;

                    switch (criteria.type) {
                        case 'STREAK':
                            if (currentStreak >= criteria.value) earned = true;
                            break;
                        case 'POINTS':
                            if (newPoints >= criteria.value) earned = true;
                            break;
                        case 'TOTAL_SOLVED':
                            if (newTotalSolved >= criteria.value) earned = true;
                            break;
                        case 'CATEGORY_SOLVED':
                            if (criteria.category && (categoryCounts[criteria.category] || 0) >= criteria.value) {
                                earned = true;
                            }
                            break;
                        case 'ACTIVE_DAYS':
                            const activeDaysCount = Object.keys(submissionHeatmap).length;
                            if (activeDaysCount >= criteria.value) earned = true;
                            break;
                    }
                    
                    if (earned) {
                        newAchievements[badge.name] = {
                            name: badge.name,
                            description: criteria.description,
                            date: serverTimestamp(),
                        };
                        awardedBadges.push(badge.name);
                    }
                }
            }


            // --- Perform Update ---
            transaction.update(userDocRef, {
                points: newPoints,
                dsaStats,
                categoryPoints,
                submissionHeatmap,
                solvedProblems,
                currentStreak,
                maxStreak,
                lastSolvedDate: today,
                achievements: newAchievements,
            });
        });

        let successMessage = `All tests passed! You've earned ${pointsToAward} points.`;
        if (awardedBadges.length > 0) {
            log.push(`\n> New Badges Earned: ${awardedBadges.join(', ')}`);
            successMessage += ` You've earned new badge(s): ${awardedBadges.join(', ')}!`;
        }
        return successMessage;
    } catch (e: any) {
        console.error("Error in award points transaction:", e);
        log.push(`\n> Error updating profile: ${e.message}`);
        return "All tests passed, but there was an error updating your profile.";
    }
}

export async function submitApexSolution(userId: string, problem: Problem, userCode: string): Promise<SubmissionResult> {
    const log: string[] = [];
    
    try {
        log.push("--- Starting Submission ---");
        
        const userDocRefCheck = await getDoc(doc(db, "users", userId));
        if (userDocRefCheck.exists() && userDocRefCheck.data().solvedProblems?.[problem.id]) {
            return { success: true, message: "You have already solved this problem.", details: "You have already solved this problem." };
        }

        const isTestClassProblem = problem.metadataType === 'Test Class';

        // For regular problems, ensure user code matches expected metadata type
        if (!isTestClassProblem) {
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
        }
        
        const mainObjectName = getClassName(problem.sampleCode);
        const testObjectName = getClassName(isTestClassProblem ? userCode : problem.testcases);
        
        if (!mainObjectName || !testObjectName) {
            throw new Error('Could not determine class/trigger names from the provided code.');
        }

        const auth = await getSfdcConnection(userId);
        
        const objectType = problem.metadataType === 'Class' || problem.metadataType === 'Test Class' ? 'ApexClass' : 'ApexTrigger';
        if (objectType === 'ApexTrigger' && !problem.triggerSObject) {
            const msg = "This trigger problem is missing its associated SObject. An administrator needs to update the problem configuration.";
            return { success: false, message: 'Problem Configuration Error', details: msg };
        }
        
        const mainObjectId = await deployMetadata(log, auth, objectType, mainObjectName, problem.sampleCode, problem.triggerSObject);
        const testClassId = await deployMetadata(log, auth, 'ApexClass', testObjectName, isTestClassProblem ? userCode : problem.testcases);

        log.push("\n--- Running Tests ---");
        const testRunResult = await sfdcFetch(auth, '/services/data/v59.0/tooling/runTestsAsynchronous/', {
            method: 'POST',
            body: JSON.stringify({ classids: testClassId })
        });
        const apexTestRunId = testRunResult;

        let jobStatus;
        for (let i = 0; i < 30; i++) {
            await sleep(1000);
            const jobQuery = `SELECT Status FROM AsyncApexJob WHERE Id = '${apexTestRunId}'`;
            const jobResult = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=${encodeURIComponent(jobQuery)}`);
            if (jobResult.records.length > 0) {
                jobStatus = jobResult.records[0].Status;
                if (['Completed', 'Failed', 'Aborted'].includes(jobStatus)) break;
            }
        }

        if (jobStatus !== 'Completed') {
            throw new Error(`Test run did not complete successfully. Final status: ${jobStatus || 'Timed Out'}`);
        }
        
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

        let coverageData;
        if (isTestClassProblem) {
            log.push("\n--- Checking Code Coverage ---");
            const coverageQuery = `SELECT CoveredLines, UncoveredLines FROM ApexCodeCoverage WHERE ApexClassOrTriggerId = '${mainObjectId}'`;
            const coverageResult = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=${encodeURIComponent(coverageQuery)}`);
            
            if (coverageResult.records && coverageResult.records.length > 0) {
                const coverage = coverageResult.records[0];
                const coveredCount = coverage.CoveredLines?.length || 0;
                const uncoveredCount = coverage.UncoveredLines?.length || 0;
                const total = coveredCount + uncoveredCount;
                const percentage = total > 0 ? (coveredCount / total) * 100 : 100;
                log.push(`> Coverage: ${percentage.toFixed(2)}% (${coveredCount}/${total} lines covered).`);
                
                coverageData = {
                    covered: coverage.CoveredLines || [],
                    uncovered: coverage.UncoveredLines || []
                };

                if (percentage < 75) {
                    throw new Error(`Test Coverage Failed: Required coverage is 75%, but you only achieved ${percentage.toFixed(2)}%.`);
                }
                log.push("> Coverage goal of 75% met!");
            } else {
                log.push("> Could not retrieve code coverage information.");
                throw new Error("Could not retrieve code coverage. Unable to verify solution.");
            }
        }

        const successMessage = await _awardPointsAndLogProgress(log, userId, problem);
        
        return { success: true, message: successMessage, details: log.join('\n'), coverage: coverageData };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        log.push(`\n--- ERROR ---`);
        log.push(errorMessage);
        return { success: false, message: 'An error occurred during submission.', details: log.join('\n') };
    }
}

type TestFailureDetails = {
    methodName: string;
    message: string;
    stackTrace: string;
};

type TestProblemResult = {
    success: boolean;
    message: string;
    failureDetails?: TestFailureDetails;
};

export async function testApexProblem(userId: string, problem: Partial<Problem>): Promise<TestProblemResult> {
    if (!userId || !problem || !problem.sampleCode || !problem.testcases || !problem.metadataType) {
        return { success: false, message: "Missing required problem data for testing." };
    }

    try {
        const auth = await getSfdcConnection(userId);
        
        const objectType = problem.metadataType === 'Class' || problem.metadataType === 'Test Class' ? 'ApexClass' : 'ApexTrigger';
        if (objectType === 'ApexTrigger' && !problem.triggerSObject) {
            return { success: false, message: "Trigger SObject is required." };
        }
        
        const mainObjectName = getClassName(problem.sampleCode);
        const testObjectName = getClassName(problem.testcases);
        
        if (!mainObjectName || !testObjectName) {
            return { success: false, message: "Could not determine class/trigger names from code." };
        }

        await deployMetadata([], auth, objectType, mainObjectName, problem.sampleCode, problem.triggerSObject);
        const testClassId = await deployMetadata([], auth, 'ApexClass', testObjectName, problem.testcases);

        const testRunResult = await sfdcFetch(auth, '/services/data/v59.0/tooling/runTestsAsynchronous/', {
            method: 'POST',
            body: JSON.stringify({ classids: testClassId })
        });
        const apexTestRunId = testRunResult;

        let jobStatus;
        for (let i = 0; i < 30; i++) {
            await sleep(1000);
            const jobResult = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=SELECT Status FROM AsyncApexJob WHERE Id = '${apexTestRunId}'`);
            if (jobResult.records.length > 0) {
                jobStatus = jobResult.records[0].Status;
                if (['Completed', 'Failed', 'Aborted'].includes(jobStatus)) break;
            }
        }
        
        if (jobStatus !== 'Completed') {
            return { success: false, message: `Test run failed. Final status: ${jobStatus || 'Timed Out'}` };
        }

        const resultQuery = `SELECT MethodName, Outcome, Message, StackTrace FROM ApexTestResult WHERE AsyncApexJobId = '${apexTestRunId}'`;
        const testResultData = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=${encodeURIComponent(resultQuery)}`);
        
        const failedTest = testResultData.records.find((r: any) => r.Outcome !== 'Pass');
        if (failedTest) {
            return {
                success: false,
                message: `Test Failed: ${failedTest.MethodName}`,
                failureDetails: {
                    methodName: failedTest.MethodName,
                    message: failedTest.Message,
                    stackTrace: failedTest.StackTrace || 'No stack trace available.',
                }
            };
        }

        return { success: true, message: "All test cases passed." };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, message: errorMessage };
    }
}

export async function executeSalesforceCode(
    userId: string, 
    code: string, 
    executionType: 'anonymous' | 'class' | 'soql',
    testCode?: string,
): Promise<{ success: boolean; result: any; logs: string; type: 'soql' | 'apex' }> {
    try {
        const auth = await getSfdcConnection(userId);

        if (executionType === 'soql') {
            const endpoint = `${auth.instanceUrl}/services/data/v59.0/query`;
            const urlWithQuery = new URL(endpoint);
            urlWithQuery.searchParams.append('q', code);
            
            const response = await fetch(urlWithQuery.toString(), {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${auth.accessToken}` },
            });
            
            const responseBody = await response.json();

            if (!response.ok) {
                const errorMessage = responseBody[0]?.message || 'SOQL query failed.';
                return { success: false, result: errorMessage, logs: JSON.stringify(responseBody, null, 2), type: 'soql' };
            }
            
            return { 
                success: true, 
                result: {
                    totalSize: responseBody.totalSize,
                    records: responseBody.records,
                },
                logs: JSON.stringify(responseBody, null, 2),
                type: 'soql',
            };
        } else if (executionType === 'class' && testCode) {
            const log: string[] = [];
            try {
                const mainObjectName = getClassName(code);
                const testObjectName = getClassName(testCode);

                if (!mainObjectName || !testObjectName) throw new Error('Could not determine class names.');
                
                await deployMetadata(log, auth, 'ApexClass', mainObjectName, code);
                const testClassId = await deployMetadata(log, auth, 'ApexClass', testObjectName, testCode);

                const testRunId = await sfdcFetch(auth, '/services/data/v59.0/tooling/runTestsAsynchronous/', {
                    method: 'POST',
                    body: JSON.stringify({ classids: testClassId })
                });

                for (let i = 0; i < 30; i++) {
                    await sleep(1000);
                    const jobResult = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=SELECT Status FROM AsyncApexJob WHERE Id = '${testRunId}'`);
                    if (jobResult.records.length > 0 && ['Completed', 'Failed', 'Aborted'].includes(jobResult.records[0].Status)) {
                         break;
                    }
                }

                const resultQuery = `SELECT Message, MethodName, Outcome, StackTrace FROM ApexTestResult WHERE AsyncApexJobId = '${testRunId}'`;
                const testResultData = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=${encodeURIComponent(resultQuery)}`);
                const formattedResults = testResultData.records.map((r: any) => `${r.Outcome.toUpperCase()}: ${r.MethodName} - ${r.Message || 'Success'}`).join('\n');
                const didFail = testResultData.records.some((r: any) => r.Outcome === 'Fail');

                return { success: !didFail, result: formattedResults, logs: JSON.stringify(testResultData, null, 2), type: 'apex' };
            } catch (e: any) {
                return { success: false, result: e.message, logs: e.stack, type: 'apex' };
            }
        } else { // 'anonymous' or class without test
            const endpoint = `${auth.instanceUrl}/services/data/v59.0/tooling/executeAnonymous/`;
            const urlWithQuery = new URL(endpoint);
            urlWithQuery.searchParams.append('anonymousBody', code);
            
            const response = await fetch(urlWithQuery.toString(), {
                 method: 'GET',
                 headers: {
                    'Authorization': `Bearer ${auth.accessToken}`,
                    'Sforce-Log-Options': 'logLevel=FINEST'
                },
            });
    
            const responseBody = await response.json();
            
            const debugLog = response.headers.get('Sforce-Debug-Log') || response.headers.get('x-debug-log') || "";
            const logHeader = `----------\nDEBUG LOG\n----------\n`;
    
            if (responseBody.success) {
                const userDebugLines = debugLog
                    .split('\n')
                    .filter((line: string) => line.includes('|USER_DEBUG|'))
                    .map((line: string) => {
                        const parts = line.split('|');
                        const userDebugIndex = parts.indexOf('USER_DEBUG');
                        if (userDebugIndex !== -1 && parts.length > userDebugIndex + 2) {
                            return parts.slice(userDebugIndex + 3).join('|');
                        }
                        return null;
                    })
                    .filter((line: string | null): line is string => line !== null)
                    .join('\n');
    
                const resultMessage = userDebugLines.trim() 
                    ? userDebugLines.trim()
                    : 'Execution successful. No USER_DEBUG output.';
    
                return {
                    success: true,
                    result: resultMessage,
                    logs: `${logHeader}${debugLog}`,
                    type: 'apex',
                };
            } else if (!responseBody.compiled) {
                 return {
                    success: false,
                    result: `Compilation Error: ${responseBody.compileProblem}\nLine: ${responseBody.line}, Column: ${responseBody.column}`,
                    logs: `${logHeader}${debugLog}`,
                    type: 'apex'
                };
            } else { // compiled but not success
                 return {
                    success: false,
                    result: `Runtime Error: ${responseBody.exceptionMessage}\n\nStack Trace:\n${responseBody.exceptionStackTrace}`,
                    logs: `${logHeader}${debugLog}`,
                    type: 'apex'
                };
            }
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
        return {
            success: false,
            result: `An unexpected error occurred: ${errorMessage}`,
            logs: "No debug log available due to error.",
            type: executionType === 'soql' ? 'soql' : 'apex',
        };
    }
}

async function deployLwcBundle(
    log: string[],
    auth: SfdcAuth,
    name: string,
    files: { html: string; js: string; css: string }
): Promise<string> {
    log.push(`\n--- Deploying LWC: ${name} ---`);
    const bundleQuery = `SELECT Id FROM LightningComponentBundle WHERE DeveloperName = '${name}'`;
    const existingBundleResult = await sfdcFetch(auth, `/services/data/v59.0/tooling/query/?q=${encodeURIComponent(bundleQuery)}`);
    
    if (existingBundleResult.records.length > 0) {
        const bundleId = existingBundleResult.records[0].Id;
        log.push(`> Found existing bundle with ID: ${bundleId}. Deleting...`);
        try {
            await sfdcFetch(auth, `/services/data/v59.0/tooling/sobjects/LightningComponentBundle/${bundleId}`, { method: 'DELETE' });
            log.push(`> Deletion successful.`);
        } catch (e: any) {
            log.push(`> Warning: Could not delete existing LWC bundle. Error: ${e.message}`);
        }
    }

    log.push(`> Creating new LightningComponentBundle...`);
    const bundleRecord = await sfdcFetch(auth, `/services/data/v59.0/tooling/sobjects/LightningComponentBundle/`, {
        method: 'POST',
        body: JSON.stringify({
            MasterLabel: name,
            DeveloperName: name,
            ApiVersion: 59.0,
        }),
    });
    const bundleId = bundleRecord.id;
    log.push(`> Bundle created with ID: ${bundleId}.`);

    const metaXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>59.0</apiVersion>
    <isExposed>true</isExposed>
    <targets>
        <target>lightning__AppPage</target>
        <target>lightning__HomePage</target>
        <target>lightning__RecordPage</target>
    </targets>
</LightningComponentBundle>`;

    const resources = [
        { FilePath: `lwc/${name}/${name}.html`, Format: 'HTML', Source: files.html },
        { FilePath: `lwc/${name}/${name}.js`, Format: 'JS', Source: files.js },
        { FilePath: `lwc/${name}/${name}.css`, Format: 'CSS', Source: files.css },
        { FilePath: `lwc/${name}/${name}.js-meta.xml`, Format: 'XML', Source: metaXmlContent },
    ];
    
    log.push(`> Deploying ${resources.length} resources...`);
    for (const resource of resources) {
        log.push(`  - Deploying ${resource.FilePath}`);
        await sfdcFetch(auth, `/services/data/v59.0/tooling/sobjects/LightningComponentResource/`, {
            method: 'POST',
            body: JSON.stringify({
                LightningComponentBundleId: bundleId,
                FilePath: resource.FilePath,
                Format: resource.Format,
                Source: resource.Source,
            }),
        });
    }
    log.push(`> All resources deployed successfully.`);
    return bundleId;
}

export async function deployLwcComponent(
    userId: string,
    files: { html: string; js: string; css: string }
): Promise<SubmissionResult> {
    const log: string[] = [];
    try {
        log.push("Starting LWC deployment...");
        log.push("> Connecting to Salesforce...");
        const auth = await getSfdcConnection(userId);
        log.push("> Connection successful.");

        const componentName = 'codbbitPreview';
        await deployLwcBundle(log, auth, componentName, files);
        
        log.push("\n--- DEPLOYMENT SUCCEEDED ---");
        log.push(`LWC component '${componentName}' has been deployed to your org.`);
        log.push("To view it, edit any Lightning App Page and drag the component onto the canvas.");

        return { success: true, message: "Deployment successful!", details: log.join('\n') };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        log.push(`\n--- ERROR ---`);
        log.push(errorMessage);
        return { success: false, message: 'An error occurred during deployment.', details: log.join('\n') };
    }
}
