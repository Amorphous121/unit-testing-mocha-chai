const bcrypt = require('bcrypt');
require('dotenv').config();

module.exports = {
	async up(db, client) {
		const role = await db.collection('roles').findOne({ name: 'admin' });
		const hash = await bcrypt.hash("admin121", parseInt(process.env.SALT));
		const user = {
			role: role._id,
			isDeleted: false,
			name : "Prathamesh",
			username: "admin121",
			password: hash,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		await db.collection('users').insertOne(user);
	},

	async down(db, client) {
		await db.collection('users').deleteOne({ username: 'admin121' });
	}
};
