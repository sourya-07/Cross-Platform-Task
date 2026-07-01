import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Check if credentials are using defaults or are missing
const isDemoMode =
  !supabaseUrl ||
  !supabaseServiceKey ||
  supabaseUrl.includes('placeholder') ||
  supabaseUrl.includes('your-') ||
  supabaseServiceKey.includes('placeholder') ||
  supabaseServiceKey.includes('your_') ||
  supabaseServiceKey.includes('your-');

// Chronological database array stored in-memory
const mockTasksDatabase: any[] = [];

class MockSupabaseQueryBuilder {
  private table: string;
  private currentFilter: { column: string; value: any } | null = null;
  private currentInsertData: any[] | null = null;
  private currentUpdateData: any | null = null;
  private isDelete = false;
  private orderBy: { column: string; ascending: boolean } | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*') {
    return this;
  }

  insert(rows: any[]) {
    this.currentInsertData = rows;
    return this;
  }

  update(updates: any) {
    this.currentUpdateData = updates;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  eq(column: string, value: any) {
    this.currentFilter = { column, value };
    return this;
  }

  order(column: string, { ascending }: { ascending: boolean } = { ascending: false }) {
    this.orderBy = { column, ascending };
    return this;
  }

  // Internal executor method
  private async executeQuery() {
    if (this.table !== 'tasks') {
      throw new Error(`Mock client only supports 'tasks' table.`);
    }

    // Handle INSERT
    if (this.currentInsertData) {
      mockTasksDatabase.push(...this.currentInsertData);
      const inserted = this.currentInsertData[this.currentInsertData.length - 1];
      return { data: inserted, error: null, count: this.currentInsertData.length };
    }

    // Handle UPDATE
    if (this.currentUpdateData && this.currentFilter) {
      const col = this.currentFilter.column;
      const val = this.currentFilter.value;
      let updatedRow: any = null;

      for (let i = 0; i < mockTasksDatabase.length; i++) {
        if (mockTasksDatabase[i][col] === val) {
          mockTasksDatabase[i] = {
            ...mockTasksDatabase[i],
            ...this.currentUpdateData,
          };
          updatedRow = mockTasksDatabase[i];
        }
      }
      return { data: updatedRow, error: null, count: updatedRow ? 1 : 0 };
    }

    // Handle DELETE
    if (this.isDelete && this.currentFilter) {
      const col = this.currentFilter.column;
      const val = this.currentFilter.value;
      const initialCount = mockTasksDatabase.length;
      
      const keep = mockTasksDatabase.filter(t => t[col] !== val);
      const deletedCount = initialCount - keep.length;

      // Update in-place
      mockTasksDatabase.length = 0;
      mockTasksDatabase.push(...keep);

      return { data: null, error: null, count: deletedCount };
    }

    // Handle SELECT
    let results = [...mockTasksDatabase];

    if (this.currentFilter) {
      const col = this.currentFilter.column;
      const val = this.currentFilter.value;
      results = results.filter(t => t[col] === val);
    }

    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      results.sort((a, b) => {
        const valA = a[column] || '';
        const valB = b[column] || '';
        if (valA === valB) return 0;
        return ascending
          ? valA > valB ? 1 : -1
          : valA < valB ? 1 : -1;
      });
    }

    return { data: results, error: null, count: results.length };
  }

  // Support for await directly on the query builder
  then(resolve: any, reject: any) {
    this.executeQuery()
      .then(res => resolve(res))
      .catch(err => reject(err));
  }

  async maybeSingle() {
    const res = await this.executeQuery();
    const data = Array.isArray(res.data) ? (res.data[0] || null) : res.data;
    return { data, error: res.error };
  }

  async single() {
    const res = await this.executeQuery();
    const data = Array.isArray(res.data) ? res.data[0] : res.data;
    if (!data) {
      return { data: null, error: new Error('Record not found in mock database') };
    }
    return { data, error: null };
  }
}

class MockSupabaseClient {
  from(table: string) {
    return new MockSupabaseQueryBuilder(table);
  }
}

let clientInstance: any;

if (isDemoMode) {
  console.log('====================================================');
  console.log('💡 SUPABASE ENVIRONMENT DETECTED AS DEMO / PLACEHOLDER');
  console.log('💡 Running backend in Local Demo Mode (In-Memory Database)');
  console.log('====================================================');
  clientInstance = new MockSupabaseClient();
} else {
  console.log('====================================================');
  console.log('🚀 SUPABASE URL DETECTED: Connecting to Postgres Database');
  console.log('====================================================');
  clientInstance = createClient(supabaseUrl!, supabaseServiceKey!);
}

export const supabase = clientInstance;
export { isDemoMode };
