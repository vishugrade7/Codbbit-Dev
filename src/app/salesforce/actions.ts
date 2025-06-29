
'use server';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/types';

type SalesforceTokenResponse = {
  access_token: string;
  instance_url: string;
  refresh_token: string;
  issued_at: string;
  id_token: string;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
};

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
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists() || !userDoc.data().sfdcAuth?.connected) {
        return { success: false, error: 'Salesforce account not connected.' };
    }

    const { accessToken, instanceUrl } = userDoc.data().sfdcAuth as NonNullable<User['sfdcAuth']>;

    if (!accessToken || !instanceUrl) {
         return { success: false, error: 'Invalid Salesforce credentials found.' };
    }

    const endpoint = `${instanceUrl}/services/data/v59.0/tooling/executeAnonymous/?anonymousBody=${encodeURIComponent(code)}`;

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const result: ApexExecutionResult = await response.json();
        
        return { success: true, result };

    } catch (error) {
        console.error('Execute Apex Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}

export async function executeQuery(userId: string, query: string) {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists() || !userDoc.data().sfdcAuth?.connected) {
        return { success: false, error: 'Salesforce account not connected.' };
    }

    const { accessToken, instanceUrl } = userDoc.data().sfdcAuth as NonNullable<User['sfdcAuth']>;

    if (!accessToken || !instanceUrl) {
         return { success: false, error: 'Invalid Salesforce credentials found.' };
    }

    const endpoint = `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const result = await response.json();
        
        if (!response.ok) {
            const errorMessage = Array.isArray(result) ? result[0]?.message : (result.error_description || 'An unknown error occurred.');
            throw new Error(errorMessage);
        }

        return { success: true, result };

    } catch (error) {
        console.error('Execute SOQL Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}
