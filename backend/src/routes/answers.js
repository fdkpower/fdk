const express = require('express');
const router = express.Router();
const { validationResult, body, param } = require('express-validator');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const redis = require('../config/redis');

// ==================
// 错误处理中间件
// ==================
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            code: 400,
            message: '请求参数有误',
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }
    next();
};

// ==================
// 1. 提交回答
// ==================
router.post(
    '/:questionId/answers',
    requireAuth,
    param('questionId').isInt().withMessage('问题 ID 必须是整数'),
    body('content').trim().notEmpty().withMessage('回答内容不能为空').isLength({ min: 10 }).withMessage('回答内容至少 10 个字符'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { questionId } = req.params;
            const { content } = req.body;
            const userId = req.user.id;

            // 检查问题是否存在
            const questionResult = await db.query(
                `SELECT id FROM questions WHERE id = $1`,
                [questionId]
            );

            if (questionResult.rows.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '问题不存在'
                });
            }

            // 插入回答
            const answerResult = await db.query(
                `INSERT INTO answers (question_id, user_id, content)
                 VALUES ($1, $2, $3)
                 RETURNING id, content, is_accepted, upvote_count, created_at`,
                [questionId, userId, content]
            );

            const answerId = answerResult.rows[0].id;

            // 更新问题的回答计数
            await db.query(
                `UPDATE questions SET answer_count = answer_count + 1 WHERE id = $1`,
                [questionId]
            );

            // 清除缓存
            await redis.del(`question:${questionId}`);

            res.status(201).json({
                code: 201,
                message: '回答已提交',
                data: {
                    id: answerId,
                    question_id: parseInt(questionId),
                    user_id: userId,
                    content,
                    is_accepted: false,
                    upvote_count: 0,
                    created_at: answerResult.rows[0].created_at
                }
            });
        } catch (err) {
            console.error('提交回答出错:', err);
            res.status(500).json({
                code: 500,
                message: '服务器错误'
            });
        }
    }
);

// ==================
// 2. 编辑回答
// ==================
router.put(
    '/:answerId',
    requireAuth,
    param('answerId').isInt().withMessage('回答 ID 必须是整数'),
    body('content').trim().notEmpty().withMessage('回答内容不能为空').isLength({ min: 10 }).withMessage('回答内容至少 10 个字符'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { answerId } = req.params;
            const { content } = req.body;
            const userId = req.user.id;

            // 检查回答是否存在且属于当前用户
            const answerResult = await db.query(
                `SELECT user_id, question_id FROM answers WHERE id = $1`,
                [answerId]
            );

            if (answerResult.rows.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '回答不存在'
                });
            }

            if (answerResult.rows[0].user_id !== userId) {
                return res.status(403).json({
                    code: 403,
                    message: '无权修改此回答'
                });
            }

            const questionId = answerResult.rows[0].question_id;

            // 更新回答
            await db.query(
                `UPDATE answers SET content = $1, updated_at = NOW() WHERE id = $2`,
                [content, answerId]
            );

            // 清除缓存
            await redis.del(`question:${questionId}`);

            res.json({
                code: 200,
                message: '回答已更新'
            });
        } catch (err) {
            console.error('编辑回答出错:', err);
            res.status(500).json({
                code: 500,
                message: '服务器错误'
            });
        }
    }
);

// ==================
// 3. 删除回答
// ==================
router.delete(
    '/:answerId',
    requireAuth,
    param('answerId').isInt().withMessage('回答 ID 必须是整数'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { answerId } = req.params;
            const userId = req.user.id;

            // 检查回答是否存在且属于当前用户
            const answerResult = await db.query(
                `SELECT user_id, question_id, is_accepted FROM answers WHERE id = $1`,
                [answerId]
            );

            if (answerResult.rows.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '回答不存在'
                });
            }

            if (answerResult.rows[0].user_id !== userId) {
                return res.status(403).json({
                    code: 403,
                    message: '无权删除此回答'
                });
            }

            const questionId = answerResult.rows[0].question_id;
            const isAccepted = answerResult.rows[0].is_accepted;

            // 删除回答
            await db.query(`DELETE FROM answers WHERE id = $1`, [answerId]);

            // 更新问题计数
            await db.query(
                `UPDATE questions SET answer_count = answer_count - 1 WHERE id = $1`,
                [questionId]
            );

            // 如果这是被采纳的回答，清除采纳状态
            if (isAccepted) {
                await db.query(
                    `UPDATE questions SET accepted_answer_id = NULL WHERE id = $1`,
                    [questionId]
                );
            }

            // 清除缓存
            await redis.del(`question:${questionId}`);

            res.json({
                code: 200,
                message: '回答已删除'
            });
        } catch (err) {
            console.error('删除回答出错:', err);
            res.status(500).json({
                code: 500,
                message: '服务器错误'
            });
        }
    }
);

// ==================
// 4. 采纳回答
// ==================
router.post(
    '/:answerId/accept',
    requireAuth,
    param('answerId').isInt().withMessage('回答 ID 必须是整数'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { answerId } = req.params;
            const userId = req.user.id;

            // 获取回答信息
            const answerResult = await db.query(
                `SELECT a.question_id, a.user_id, a.is_accepted, q.user_id as question_user_id
                 FROM answers a
                 JOIN questions q ON a.question_id = q.id
                 WHERE a.id = $1`,
                [answerId]
            );

            if (answerResult.rows.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '回答不存在'
                });
            }

            const { question_id: questionId, user_id: answerUserId, is_accepted: isAccepted, question_user_id: questionUserId } = answerResult.rows[0];

            // 检查是否是问题发布者
            if (questionUserId !== userId) {
                return res.status(403).json({
                    code: 403,
                    message: '只有问题发布者才能采纳回答'
                });
            }

            if (isAccepted) {
                return res.status(400).json({
                    code: 400,
                    message: '此回答已被采纳'
                });
            }

            // 取消其他已采纳的回答
            await db.query(
                `UPDATE answers SET is_accepted = FALSE WHERE question_id = $1 AND is_accepted = TRUE`,
                [questionId]
            );

            // 采纳此回答
            await db.query(
                `UPDATE answers SET is_accepted = TRUE, accepted_at = NOW() WHERE id = $1`,
                [answerId]
            );

            // 更新问题的采纳回答
            await db.query(
                `UPDATE questions SET accepted_answer_id = $1, status = 'solved' WHERE id = $2`,
                [answerId, questionId]
            );

            // 给回答者增加声誉值
            await db.query(
                `UPDATE users SET reputation_score = reputation_score + 15 WHERE id = $1`,
                [answerUserId]
            );

            // 清除缓存
            await redis.del(`question:${questionId}`);

            res.json({
                code: 200,
                message: '回答已采纳',
                data: {
                    accepted_at: new Date().toISOString()
                }
            });
        } catch (err) {
            console.error('采纳回答出错:', err);
            res.status(500).json({
                code: 500,
                message: '服务器错误'
            });
        }
    }
);

// ==================
// 5. 获取回答详情
// ==================
router.get(
    '/:answerId',
    param('answerId').isInt().withMessage('回答 ID 必须是整数'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { answerId } = req.params;

            const answerResult = await db.query(
                `SELECT a.*, u.id as user_id, u.username, u.avatar_url,
                        COUNT(DISTINCT v.id) as upvote_count
                 FROM answers a
                 JOIN users u ON a.user_id = u.id
                 LEFT JOIN votes v ON v.votable_type = 'answer' AND v.votable_id = a.id AND v.vote_type = 1
                 WHERE a.id = $1
                 GROUP BY a.id, u.id`,
                [answerId]
            );

            if (answerResult.rows.length === 0) {
                return res.status(404).json({
                    code: 404,
                    message: '回答不存在'
                });
            }

            const answer = answerResult.rows[0];

            res.json({
                code: 200,
                message: '获取成功',
                data: {
                    id: answer.id,
                    question_id: answer.question_id,
                    content: answer.content,
                    is_accepted: answer.is_accepted,
                    upvote_count: answer.upvote_count,
                    user: {
                        id: answer.user_id,
                        username: answer.username,
                        avatar_url: answer.avatar_url
                    },
                    created_at: answer.created_at,
                    updated_at: answer.updated_at
                }
            });
        } catch (err) {
            console.error('获取回答详情出错:', err);
            res.status(500).json({
                code: 500,
                message: '服务器错误'
            });
        }
    }
);

module.exports = router;
