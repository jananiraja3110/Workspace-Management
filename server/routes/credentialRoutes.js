const express = require('express');
const router = express.Router();
const {
  getCredentials,
  getCredentialById,
  createCredential,
  updateCredential,
  deleteCredential,
} = require('../controllers/credentialController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getCredentials);
router.get('/:id', getCredentialById);
router.post('/', createCredential);
router.put('/:id', updateCredential);
router.delete('/:id', deleteCredential);

module.exports = router;
