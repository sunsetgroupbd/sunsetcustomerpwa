// Script to delete users from Sunset Group database
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.resolve(__dirname, '../sunset.db');
const db = new DatabaseSync(dbPath);

const target = process.argv[2] || '--customers';

console.log(`Targeting database: ${dbPath}`);

if (target === '--all') {
  // Delete all users and all dependent records
  db.exec(`
    PRAGMA foreign_keys = OFF;
    DELETE FROM audit_logs;
    DELETE FROM application_status_history;
    DELETE FROM application_remarks;
    DELETE FROM application_documents;
    DELETE FROM application_edit_requests;
    DELETE FROM payment_details;
    DELETE FROM ownership_details;
    DELETE FROM bank_details;
    DELETE FROM nominees;
    DELETE FROM applicant_info;
    DELETE FROM applications;
    DELETE FROM users;
    PRAGMA foreign_keys = ON;
  `);
  console.log('✅ ALL users and associated application records have been permanently deleted.');
} else if (target === '--customers') {
  // Delete only customers and their applications, keeping Admin, CR, and Sales team
  db.exec(`
    PRAGMA foreign_keys = OFF;
    DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE role = 'customer');
    DELETE FROM application_status_history WHERE application_id IN (SELECT id FROM applications WHERE customer_id IN (SELECT id FROM users WHERE role = 'customer'));
    DELETE FROM application_remarks WHERE application_id IN (SELECT id FROM applications WHERE customer_id IN (SELECT id FROM users WHERE role = 'customer'));
    DELETE FROM application_documents WHERE application_id IN (SELECT id FROM applications WHERE customer_id IN (SELECT id FROM users WHERE role = 'customer'));
    DELETE FROM application_edit_requests WHERE application_id IN (SELECT id FROM applications WHERE customer_id IN (SELECT id FROM users WHERE role = 'customer'));
    DELETE FROM payment_details WHERE application_id IN (SELECT id FROM applications WHERE customer_id IN (SELECT id FROM users WHERE role = 'customer'));
    DELETE FROM ownership_details WHERE application_id IN (SELECT id FROM applications WHERE customer_id IN (SELECT id FROM users WHERE role = 'customer'));
    DELETE FROM bank_details WHERE application_id IN (SELECT id FROM applications WHERE customer_id IN (SELECT id FROM users WHERE role = 'customer'));
    DELETE FROM nominees WHERE application_id IN (SELECT id FROM applications WHERE customer_id IN (SELECT id FROM users WHERE role = 'customer'));
    DELETE FROM applicant_info WHERE application_id IN (SELECT id FROM applications WHERE customer_id IN (SELECT id FROM users WHERE role = 'customer'));
    DELETE FROM applications WHERE customer_id IN (SELECT id FROM users WHERE role = 'customer');
    DELETE FROM users WHERE role = 'customer';
    PRAGMA foreign_keys = ON;
  `);
  console.log('✅ All CUSTOMER users and their applications have been deleted. Admin, CR, and Sales staff are preserved.');
} else {
  console.log('Usage:');
  console.log('  node backend/scripts/delete_users.js --customers   (Deletes only customers)');
  console.log('  node backend/scripts/delete_users.js --all         (Deletes ALL users)');
}

// Print remaining user count summary
const summary = db.prepare('SELECT role, count(*) as count FROM users GROUP BY role').all();
console.log('\nCurrent Users in Database:');
if (summary.length === 0) {
  console.log('  (Database has 0 users)');
} else {
  summary.forEach((row) => console.log(`  - ${row.role}: ${row.count}`));
}
