// backend/controllers/odataController.js
const db = require('../config/database');

class ODataController {
    
    // ==========================================
    // METADATA
    // ==========================================
    
    static getMetadata(req, res) {
        res.set('Content-Type', 'application/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="EduSupport">
      
      <!-- Donation Entity -->
      <EntityType Name="Donation">
        <Key>
          <PropertyRef Name="ID"/>
        </Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="donor_id" Type="Edm.Int32"/>
        <Property Name="donor_name" Type="Edm.String"/>
        <Property Name="amount" Type="Edm.Decimal" Scale="2"/>
        <Property Name="donation_type" Type="Edm.String"/>
        <Property Name="payment_method" Type="Edm.String"/>
        <Property Name="donation_date" Type="Edm.DateTimeOffset"/>
        <Property Name="status" Type="Edm.String"/>
        <Property Name="created_at" Type="Edm.DateTimeOffset"/>
      </EntityType>
      
      <EntityContainer Name="EduSupportService">
        <EntitySet Name="Donations" EntityType="EduSupport.Donation"/>
      </EntityContainer>
      
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`);
    }
    
    // ==========================================
    // GET ALL DONATIONS
    // ==========================================
    
    static async getDonations(req, res) {
        try {
            const userId = req.user.id;
            
            const { $top, $skip, $orderby, $count } = req.query;
            
            let query = `
                SELECT 
                    d.id as ID,
                    d.donor_id,
                    u.first_name || ' ' || u.last_name as donor_name,
                    d.amount,
                    d.donation_type,
                    d.payment_method,
                    d.donation_date,
                    d.status
                FROM donations d
                LEFT JOIN users u ON d.donor_id = u.id
                WHERE d.donor_id = ?
            `;
            
            const queryParams = [userId];
            
            // Order by
            if ($orderby) {
                const orderField = $orderby.replace(' desc', '').replace(' asc', '');
                const orderDir = $orderby.includes('desc') ? 'DESC' : 'ASC';
                query += ` ORDER BY ${orderField} ${orderDir}`;
            } else {
                query += ` ORDER BY d.donation_date DESC`;
            }
            
            // Pagination
            const top = parseInt($top) || 20;
            const skip = parseInt($skip) || 0;
            query += ` LIMIT ${top} OFFSET ${skip}`;
            
            // Execute query
            const [donations] = await db.query(query, queryParams);
            
            // Count
            const [countResult] = await db.query(
                'SELECT COUNT(*) as total FROM donations WHERE donor_id = ?',
                [userId]
            );
            
            // Response
            const response = {
                "@odata.context": "$metadata#Donations",
                "value": (donations || []).map(d => ({
                    ID: d.ID,
                    donor_id: d.donor_id,
                    donor_name: d.donor_name,
                    amount: parseFloat(d.amount || 0),
                    donation_type: d.donation_type,
                    payment_method: d.payment_method,
                    donation_date: d.donation_date,
                    status: d.status
                }))
            };
            
            if ($count === 'true' && countResult && countResult.length > 0) {
                response["@odata.count"] = countResult[0].total;
            }
            
            res.json(response);
            
        } catch (error) {
            console.error('❌ OData getDonations error:', error);
            res.status(500).json({
                error: {
                    code: "500",
                    message: error.message
                }
            });
        }
    }
    
    // ==========================================
    // GET SINGLE DONATION
    // ==========================================
    
    static async getDonation(req, res) {
        try {
            const donationId = req.params.donationId;
            const userId = req.user.id;
            
            const [donations] = await db.query(`
                SELECT 
                    d.id as ID,
                    d.donor_id,
                    u.first_name || ' ' || u.last_name as donor_name,
                    d.amount,
                    d.donation_type,
                    d.payment_method,
                    d.donation_date,
                    d.status
                FROM donations d
                LEFT JOIN users u ON d.donor_id = u.id
                WHERE d.id = ? AND d.donor_id = ?
            `, [donationId, userId]);
            
            if (!donations || donations.length === 0) {
                return res.status(404).json({
                    error: {
                        code: "404",
                        message: "Donation not found"
                    }
                });
            }
            
            const donation = donations[0];
            
            res.json({
                "@odata.context": "$metadata#Donations/$entity",
                ID: donation.ID,
                donor_id: donation.donor_id,
                donor_name: donation.donor_name,
                amount: parseFloat(donation.amount || 0),
                donation_type: donation.donation_type,
                payment_method: donation.payment_method,
                donation_date: donation.donation_date,
                status: donation.status
            });
            
        } catch (error) {
            console.error('❌ OData getDonation error:', error);
            res.status(500).json({
                error: {
                    code: "500",
                    message: error.message
                }
            });
        }
    }
    
    // ==========================================
    // CREATE DONATION
    // ==========================================
    
    static async createDonation(req, res) {
        try {
            const userId = req.user.id;
            const { amount, donation_type, payment_method } = req.body;
            
            const [result] = await db.run(`
                INSERT INTO donations 
                (donor_id, amount, donation_type, payment_method, status)
                VALUES (?, ?, ?, ?, 'completed')
            `, [userId, amount, donation_type, payment_method || 'credit_card']);
            
            res.status(201).json({
                "@odata.context": "$metadata#Donations/$entity",
                ID: result.insertId,
                donor_id: userId,
                amount: parseFloat(amount),
                donation_type,
                payment_method: payment_method || 'credit_card',
                status: 'completed'
            });
            
        } catch (error) {
            console.error('❌ OData createDonation error:', error);
            res.status(500).json({
                error: {
                    code: "500",
                    message: error.message
                }
            });
        }
    }
    
    // ==========================================
    // UPDATE & DELETE (benzer şekilde)
    // ==========================================
    
    static async updateDonation(req, res) {
        try {
            const donationId = req.params.donationId;
            const userId = req.user.id;
            const updates = req.body;
            
            // Ownership check
            const [existing] = await db.query(
                'SELECT * FROM donations WHERE id = ? AND donor_id = ?',
                [donationId, userId]
            );
            
            if (!existing || existing.length === 0) {
                return res.status(404).json({
                    error: { code: "404", message: "Donation not found" }
                });
            }
            
            // Build update query
            const fields = [];
            const values = [];
            
            if (updates.amount !== undefined) {
                fields.push('amount = ?');
                values.push(updates.amount);
            }
            if (updates.donation_type !== undefined) {
                fields.push('donation_type = ?');
                values.push(updates.donation_type);
            }
            
            if (fields.length > 0) {
                values.push(donationId);
                await db.run(
                    `UPDATE donations SET ${fields.join(', ')} WHERE id = ?`,
                    values
                );
            }
            
            res.status(204).send();
            
        } catch (error) {
            console.error('❌ OData updateDonation error:', error);
            res.status(500).json({
                error: { code: "500", message: error.message }
            });
        }
    }
    
    static async deleteDonation(req, res) {
        try {
            const donationId = req.params.donationId;
            const userId = req.user.id;
            
            const [result] = await db.run(
                'DELETE FROM donations WHERE id = ? AND donor_id = ?',
                [donationId, userId]
            );
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: { code: "404", message: "Donation not found" }
                });
            }
            
            res.status(204).send();
            
        } catch (error) {
            console.error('❌ OData deleteDonation error:', error);
            res.status(500).json({
                error: { code: "500", message: error.message }
            });
        }
    }
}

module.exports = ODataController;