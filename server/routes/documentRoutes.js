const express = require('express');
const router = express.Router();
const {
  getCompanyDocs,
  getMyDocs,
  uploadDocument,
  downloadDocument,
  deleteDocument,
} = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(protect);

router.get('/company', getCompanyDocs);
router.get('/my', getMyDocs);
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/:id/download', downloadDocument);
router.delete('/:id', deleteDocument);

module.exports = router;
