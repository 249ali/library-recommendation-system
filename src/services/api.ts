import { Book, ReadingList, Review, Recommendation } from '@/types';
import { fetchAuthSession } from 'aws-amplify/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    }
  } catch {
    // Fall through to return basic headers
  }
  
  return {
    'Content-Type': 'application/json',
  };
}

export async function getBooks(): Promise<Book[]> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/books`, {
    headers,
  });

  if (!response.ok) throw new Error('Failed to fetch books');
  return response.json();
}


export async function getBook(id: string): Promise<Book | null> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/books/${id}`, {
    headers,
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to fetch book');

  return response.json();
}


export async function createBook(book: Omit<Book, 'id'>): Promise<Book> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/books`, {
    method: 'POST',
    headers,
    body: JSON.stringify(book) 
  });
  if (!response.ok) {
    throw new Error('Failed to create book');
  }
  return response.json();
}

export async function updateBook(
  id: string,
  book: Partial<Book>
): Promise<Book> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/books/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(book),
  });

  if (!response.ok) {
    throw new Error('Failed to update book');
  }

  return response.json();
}

export async function deleteBook(id: string): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/books/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    throw new Error('Failed to delete book');
  }
}

export async function getRecommendations(query: string): Promise<Recommendation[]> {
  try {
    console.log('Getting AI recommendations for query:', query);
    
    const headers = await getAuthHeaders();
    console.log('Request headers:', headers);
    
    const requestBody = { query };
    console.log('Request body:', requestBody);
    
    const response = await fetch(`${API_BASE_URL}/recommendations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Failed to get recommendations: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Raw API response:', data);
    
    // The Lambda returns { recommendations: [...] }
    const recommendations = data.recommendations || [];
    
    // Convert the Bedrock response to match our frontend Recommendation type
    const formattedRecommendations: Recommendation[] = recommendations.map((rec: any, index: number) => ({
      id: `bedrock-${index}`,
      bookId: `unknown-${index}`, // We'll need to match titles to our book IDs
      reason: rec.reason || `${rec.title} by ${rec.author} - ${rec.reason}`,
      confidence: rec.confidence || 0.8,
      // Store the AI response data for display
      title: rec.title,
      author: rec.author,
    }));
    
    console.log('Formatted recommendations:', formattedRecommendations);
    return formattedRecommendations;
    
  } catch (error) {
    console.error('Error getting recommendations:', error);
    throw error;
  }
}


/**
 * Get user's reading lists
 *
 * TODO: Replace with real API call in Week 2, Day 5-7
 *
 * Implementation steps:
 * 1. Deploy Lambda function: library-get-reading-lists
 * 2. Lambda should query DynamoDB by userId (from Cognito token)
 * 3. Create API Gateway endpoint: GET /reading-lists
 * 4. Add Cognito authorizer (Week 3)
 * 5. Replace mock code below with:
 *
 * const headers = await getAuthHeaders();
 * const response = await fetch(`${API_BASE_URL}/reading-lists`, {
 *   headers
 * });
 * if (!response.ok) throw new Error('Failed to fetch reading lists');
 * return response.json();
 *
 * Expected response: Array of ReadingList objects for the authenticated user
 */
export async function getReadingLists(): Promise<ReadingList[]> {
  try {
    console.log('Fetching reading lists...');
    
    const headers = await getAuthHeaders();
    console.log('Headers for getReadingLists:', headers);
    
    // Try to get the current user to use their real ID
    let userId = 'test-user-123'; // fallback
    
    try {
      const { getCurrentUser } = await import('aws-amplify/auth');
      const user = await getCurrentUser();
      userId = user.userId;
      console.log('Using real user ID:', userId);
    } catch (authError) {
      console.log('Could not get current user, using fallback:', userId);
    }
    
    const url = `${API_BASE_URL}/reading-lists?userId=${userId}`;
    console.log('Fetching from URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Failed to fetch reading lists: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Fetched reading lists:', data);
    
    return data;
  } catch (error) {
    console.error('Error fetching reading lists:', error);
    throw error;
  }
}

export async function createReadingList(
  list: Omit<ReadingList, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ReadingList> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/reading-lists`, {
    method: 'POST',
    headers,
    body: JSON.stringify(list),
  });
  if (!response.ok) throw new Error('Failed to create reading list');
  return response.json();
}

export async function updateReadingList(
  id: string,
  list: Partial<ReadingList>
): Promise<ReadingList> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/reading-lists/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(list),
  });

  if (!response.ok) {
    throw new Error('Failed to update reading list');
  }

  return response.json();
}


export async function deleteReadingList(id: string): Promise<void> {
  try {
    console.log('Deleting reading list:', id);
    
    // Get current user
    const { getCurrentUser } = await import('aws-amplify/auth');
    const user = await getCurrentUser();
    const userId = user.userId;
    
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/reading-lists/${id}?userId=${userId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete reading list: ${response.status} - ${errorText}`);
    }
    
    console.log('Reading list deleted successfully');
  } catch (error) {
    console.error('Error deleting reading list:', error);
    throw error;
  }
}

/////////////////////////////////////////
/**
 * Add a book to a reading list
 */
export async function addBookToReadingList(listId: string, bookId: string): Promise<ReadingList> {
  try {
    console.log('Adding book to reading list:', { listId, bookId });
    
    // Get current user
    const { getCurrentUser } = await import('aws-amplify/auth');
    const user = await getCurrentUser();
    const userId = user.userId;
    
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/reading-lists/${listId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        userId: userId,
        bookIds: { action: 'add', bookId: bookId }
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to add book to reading list: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error adding book to reading list:', error);
    throw error;
  }
}

/**
 * Remove a book from a reading list
 */
export async function removeBookFromReadingList(listId: string, bookId: string): Promise<ReadingList> {
  try {
    console.log('Removing book from reading list:', { listId, bookId });
    
    // Get current user
    const { getCurrentUser } = await import('aws-amplify/auth');
    const user = await getCurrentUser();
    const userId = user.userId;
    
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/reading-lists/${listId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        userId: userId,
        bookIds: { action: 'remove', bookId: bookId }
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to remove book from reading list: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error removing book from reading list:', error);
    throw error;
  }
}