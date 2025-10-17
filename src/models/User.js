const {query} = require('../config/database');
const bcrypt = require('bcryptjs');

class User{
    static async create(userData){
        const {email, password, full_name,phone,  role='customer'} = userData;

        // Hash the password before storing
        const hashedPassword = await bcrypt.hash(password, 12);
        const result = await query(
        `INSERT INTO users (email, password_hash, full_name, phone, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING user_id, email, full_name, phone, role, account_status, has_credit_account, 
                    credit_limit, current_balance, created_at`,
        [email, hashedPassword, full_name, phone, role]
        );

        return result.rows[0];
    }
}