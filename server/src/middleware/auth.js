const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'college_bus_secret_key_2026';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      user_id: user.user_id,
      name: user.name,
      role: user.role,
      assigned_bus_id: user.assigned_bus_id,
      assigned_stop_id: user.assigned_stop_id
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const userRole = (req.user.role || '').toUpperCase();
    const isAllowed = allowedRoles.some((allowed) => {
      const a = allowed.toUpperCase();
      if (a === userRole) return true;
      if (
        a === 'COORDINATOR' &&
        (userRole.includes('COORDINATOR') || userRole === 'STUDENT_COORDINATOR' || userRole === 'STOP_COORDINATOR')
      ) {
        return true;
      }
      return false;
    });

    if (!isAllowed) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role permissions.' });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
  requireRole
};
