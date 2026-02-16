// const LocalStrategy = require('passport-local').Strategy;
// const bcrypt = require('bcryptjs');
// const User = require('../models/User');

// module.exports = function(passport) {
//   passport.use(new LocalStrategy(async (username, password, done) => {
//     try {
//       const user = await User.findOne({ where: { username } });
//       if (!user) return done(null, false, { message: 'Usuário não encontrado' });

//       const isMatch = await bcrypt.compare(password, user.password);
//       if (isMatch) return done(null, user);
//       else return done(null, false, { message: 'Senha incorreta' });
//     } catch (err) { return done(err); }
//   }));

//   passport.serializeUser((user, done) => done(null, user.id));
//   passport.deserializeUser(async (id, done) => {
//     const user = await User.findByPk(id);
//     done(null, user);
//   });
// };