// checkTables.js - 檢查資料庫中的表名稱
// 在後端目錄執行: node checkTables.js
require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.MSDB_USER,
  password: process.env.MSDB_PASS,
  server: process.env.MSDB_HOST,
  port: parseInt(process.env.MSDB_PORT, 10),
  database: process.env.MSDB_SPI,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: true,
  }
};

async function checkTables() {
  let pool;
  try {
    console.log('🔍 連接資料庫...');
    console.log(`📍 Server: ${config.server}`);
    console.log(`📍 Database: ${config.database}`);
    console.log('');
    
    pool = await sql.connect(config);
    console.log('✅ 連接成功!\n');
    
    // 查詢所有表名稱
    const result = await pool.request().query(`
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);
    
    console.log('📋 資料庫中的所有表：');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Schema\t\t表名稱');
    console.log('───────────────────────────────────────────────────────────');
    
    result.recordset.forEach((row, index) => {
      console.log(`${row.TABLE_SCHEMA}\t\t${row.TABLE_NAME}`);
    });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 總共 ${result.recordset.length} 個表\n`);
    
    // 查詢包含關鍵字的表
    console.log('🔎 包含關鍵字 (ERP/TDF/原物料/品號) 的表：');
    console.log('───────────────────────────────────────────────────────────');
    const filtered = result.recordset.filter(row => 
      row.TABLE_NAME.includes('ERP') || 
      row.TABLE_NAME.includes('TDF') || 
      row.TABLE_NAME.includes('原物料') ||
      row.TABLE_NAME.includes('品號')
    );
    
    if (filtered.length > 0) {
      filtered.forEach(row => {
        console.log(`✓ ${row.TABLE_SCHEMA}.${row.TABLE_NAME}`);
      });
      console.log('');
      
      // 如果找到目標表，查詢其欄位
      const targetTable = filtered.find(row => 
        row.TABLE_NAME.includes('南化') || 
        row.TABLE_NAME.includes('對照')
      );
      
      if (targetTable) {
        console.log(`\n📌 檢查表 [${targetTable.TABLE_SCHEMA}].[${targetTable.TABLE_NAME}] 的欄位：`);
        console.log('───────────────────────────────────────────────────────────');
        
        const columns = await pool.request().query(`
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            IS_NULLABLE
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = '${targetTable.TABLE_SCHEMA}'
          AND TABLE_NAME = '${targetTable.TABLE_NAME}'
          ORDER BY ORDINAL_POSITION
        `);
        
        columns.recordset.forEach(col => {
          const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
          const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
          console.log(`  ${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE}${length.padEnd(10)} ${nullable}`);
        });
      }
    } else {
      console.log('⚠️  沒有找到相關的表');
    }
    
    console.log('\n✅ 檢查完成');
    
  } catch (err) {
    console.error('\n❌ 錯誤:', err.message);
    if (err.code) {
      console.error('錯誤代碼:', err.code);
    }
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkTables();