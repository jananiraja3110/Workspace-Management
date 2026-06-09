const express = require('express');
const router  = express.Router();
const { getSpaces, createSpace, updateSpace, deleteSpace, getSpaceTasks } = require('../controllers/spaceController');
const { protect }    = require('../middleware/auth');
const { authorize }  = require('../middleware/roleCheck');

router.use(protect);

router.get('/',          getSpaces);
router.post('/',         authorize('admin', 'hr'), createSpace);
router.put('/:id',       authorize('admin', 'hr'), updateSpace);
router.delete('/:id',    authorize('admin'),        deleteSpace);
router.get('/:id/tasks', getSpaceTasks);

module.exports = router;
