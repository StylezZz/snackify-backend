const {query} = require('../config/database');
const bcrypt = require('bcryptjs');

class User{
    static async create(userData){
        const {email, password, full_name, phone, role='customer'} = userData;

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

    static async findByEmail(email){
        const result = await query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    }

    static async findById(userId){
        const result = await query(
            'SELECT user_id, email, full_name, phone, role, account_status, has_credit_account, credit_limit, current_balance, created_at, updated_at, last_login FROM users WHERE user_id = $1',
            [userId]
        );
        return result.rows[0] || null;
    }

    static async comparePassword(candidatePassword, hashedPassword) {
        return await bcrypt.compare(candidatePassword, hashedPassword);
    }

    static async updateLastLogin(userId) {
        const result = await query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING *',
            [userId]
        );
        return result.rows[0];
    }

    static async changePassword(userId, oldPassword, newPassword) {
        // Primero obtener la contraseña actual
        const user = await query(
            'SELECT password_hash FROM users WHERE user_id = $1',
            [userId]
        );

        if (user.rows.length === 0) {
            throw new Error('Usuario no encontrado');
        }

        // Verificar contraseña actual
        const isValidPassword = await bcrypt.compare(oldPassword, user.rows[0].password_hash);
        if (!isValidPassword) {
            throw new Error('Contraseña actual incorrecta');
        }

        // Hash nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Actualizar contraseña
        const result = await query(
            'UPDATE users SET password_hash = $1 WHERE user_id = $2 RETURNING user_id, email, full_name, phone, role, account_status',
            [hashedPassword, userId]
        );

        return result.rows[0];
    }

    static async updateProfile(userId, updates) {
        const allowedFields = ['full_name', 'phone'];
        const updateFields = [];
        const params = [];
        let paramCount = 1;

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key) && updates[key] !== undefined) {
                updateFields.push(`${key} = $${paramCount}`);
                params.push(updates[key]);
                paramCount++;
            }
        });

        if (updateFields.length === 0) {
            throw new Error('No hay campos válidos para actualizar');
        }

        params.push(userId);

        const result = await query(
            `UPDATE users 
             SET ${updateFields.join(', ')}
             WHERE user_id = $${paramCount}
             RETURNING user_id, email, full_name, phone, role, account_status, has_credit_account, credit_limit, current_balance`,
            params
        );

        return result.rows[0];
    }

    static async findAll(page = 1, limit = 10, filters = {}) {
        const offset = (page - 1) * limit;
        let whereConditions = ['1=1'];
        const params = [];
        let paramCount = 1;

        // Filtros
        if (filters.role) {
            whereConditions.push(`role = $${paramCount}`);
            params.push(filters.role);
            paramCount++;
        }

        if (filters.account_status) {
            whereConditions.push(`account_status = $${paramCount}`);
            params.push(filters.account_status);
            paramCount++;
        }

        if (filters.has_credit_account !== undefined) {
            whereConditions.push(`has_credit_account = $${paramCount}`);
            params.push(filters.has_credit_account);
            paramCount++;
        }

        // Query para obtener usuarios
        const usersResult = await query(
            `SELECT user_id, email, full_name, phone, role, account_status, 
                    has_credit_account, credit_limit, current_balance, created_at, last_login
             FROM users 
             WHERE ${whereConditions.join(' AND ')}
             ORDER BY created_at DESC 
             LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
            [...params, limit, offset]
        );

        // Query para obtener total count
        const countResult = await query(
            `SELECT COUNT(*) FROM users WHERE ${whereConditions.join(' AND ')}`,
            params
        );

        return {
            users: usersResult.rows,
            pagination: {
                current_page: page,
                per_page: limit,
                total: parseInt(countResult.rows[0].count),
                total_pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
            }
        };
    }

    static async suspendAccount(userId, reason) {
        const result = await query(
            `UPDATE users 
             SET account_status = 'suspended', suspension_reason = $2
             WHERE user_id = $1
             RETURNING user_id, email, full_name, account_status, suspension_reason`,
            [userId, reason]
        );

        return result.rows[0];
    }

    static async reactivateAccount(userId) {
        const result = await query(
            `UPDATE users 
             SET account_status = 'active', suspension_reason = NULL
             WHERE user_id = $1
             RETURNING user_id, email, full_name, account_status`,
            [userId]
        );

        return result.rows[0];
    }

    static async enableCreditAccount(userId, creditLimit) {
        const result = await query(
            `UPDATE users 
             SET has_credit_account = true, credit_limit = $2
             WHERE user_id = $1
             RETURNING user_id, email, full_name, has_credit_account, credit_limit`,
            [userId, creditLimit]
        );

        return result.rows[0];
    }

    static async disableCreditAccount(userId) {
        const result = await query(
            `UPDATE users 
             SET has_credit_account = false, credit_limit = 0
             WHERE user_id = $1
             RETURNING user_id, email, full_name, has_credit_account, credit_limit`,
            [userId]
        );

        return result.rows[0];
    }

    static async updateCreditLimit(userId, newLimit) {
        const result = await query(
            `UPDATE users 
             SET credit_limit = $2
             WHERE user_id = $1 AND has_credit_account = true
             RETURNING user_id, email, full_name, credit_limit, current_balance`,
            [userId, newLimit]
        );

        return result.rows[0];
    }

    static async getUsersWithDebt() {
        const result = await query(
            `SELECT user_id, email, full_name, phone, current_balance as debt_amount, 
                    credit_limit, account_status
             FROM users 
             WHERE has_credit_account = true AND current_balance > 0
             ORDER BY current_balance DESC`
        );

        return result.rows;
    }
}

module.exports = User;