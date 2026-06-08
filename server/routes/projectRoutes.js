const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.use(protect);

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', authorize('admin', 'hr'), createProject);
router.put('/:id', authorize('admin', 'hr'), updateProject);
router.delete('/:id', authorize('admin'), deleteProject);

module.exports = router;
