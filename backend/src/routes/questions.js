const express = require('express');
const router = express.Router();

// ==================
// 占位符路由
// ==================

// 获取问题列表
router.get('/', (req, res) => {
    res.json({
        code: 501,
        message: '该功能正在开发中'
    });
});

// 创建问题
router.post('/', (req, res) => {
    res.json({
        code: 501,
        message: '该功能正在开发中'
    });
});

// 获取问题详情
router.get('/:id', (req, res) => {
    res.json({
        code: 501,
        message: '该功能正在开发中'
    });
});

// 编辑问题
router.put('/:id', (req, res) => {
    res.json({
        code: 501,
        message: '该功能正在开发中'
    });
});

// 删除问题
router.delete('/:id', (req, res) => {
    res.json({
        code: 501,
        message: '该功能正在开发中'
    });
});

module.exports = router;
