/**
 * Milestone and Topic Configuration
 * 
 * Defines the curriculum structure, including milestones, topics, 
 * difficulty ratings, and point weights for the aptitude platform.
 * 
 * @author Aptitude AI Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const milestones = [
    {
        id: 1,
        name: 'Milestone 1',
        topics: [
            { id: 101, name: 'Number System', weight: 1.0, difficultyTag: 'easy' },
            { id: 102, name: 'HCF and LCM', weight: 1.0, difficultyTag: 'easy' },
            { id: 103, name: 'Average', weight: 1.0, difficultyTag: 'easy' },
            { id: 104, name: 'Blood Relation', weight: 1.0, difficultyTag: 'easy' },
            { id: 105, name: 'Number Series', weight: 1.0, difficultyTag: 'easy' }
        ]
    },
    {
        id: 2,
        name: 'Milestone 2',
        topics: [
            { id: 201, name: 'Ratio & Proportion', weight: 1.0, difficultyTag: 'easy' },
            { id: 202, name: 'Problems on Ages', weight: 1.25, difficultyTag: 'medium' },
            { id: 203, name: 'Mixture & Alligation', weight: 1.25, difficultyTag: 'medium' },
            { id: 204, name: 'Directions', weight: 1.0, difficultyTag: 'easy' },
            { id: 205, name: 'Alphanumeric Series', weight: 1.0, difficultyTag: 'easy' }
        ]
    },
    {
        id: 3,
        name: 'Milestone 3',
        topics: [
            { id: 301, name: 'Percentage', weight: 1.0, difficultyTag: 'easy' },
            { id: 302, name: 'Profit or Loss, Discount', weight: 1.25, difficultyTag: 'medium' },
            { id: 303, name: 'Simple Interest', weight: 1.0, difficultyTag: 'easy' },
            { id: 304, name: 'Compound Interest', weight: 1.25, difficultyTag: 'medium' },
            { id: 305, name: 'Seating Arrangement 1', weight: 1.5, difficultyTag: 'hard' }
        ]
    },
    {
        id: 4,
        name: 'Milestone 4',
        topics: [
            { id: 401, name: 'Time & Work', weight: 1.25, difficultyTag: 'medium' },
            { id: 402, name: 'Pipes & Cisterns', weight: 1.25, difficultyTag: 'medium' },
            { id: 403, name: 'Data Interpretation', weight: 1.5, difficultyTag: 'hard' },
            { id: 404, name: 'Seating Arrangement 2', weight: 1.5, difficultyTag: 'hard' },
            { id: 405, name: 'Coding Decoding', weight: 1.0, difficultyTag: 'easy' }
        ]
    },
    {
        id: 5,
        name: 'Milestone 5',
        topics: [
            { id: 501, name: 'Permutation', weight: 1.25, difficultyTag: 'medium' },
            { id: 502, name: 'Combination', weight: 1.25, difficultyTag: 'medium' },
            { id: 503, name: 'Probability', weight: 1.25, difficultyTag: 'medium' },
            { id: 504, name: 'Syllogism', weight: 1.0, difficultyTag: 'easy' },
            { id: 505, name: 'Inequalities', weight: 1.0, difficultyTag: 'easy' },
            { id: 506, name: 'Analogy & Non-Verbal Reasoning', weight: 1.0, difficultyTag: 'easy' }
        ]
    },
    {
        id: 6,
        name: 'Milestone 6',
        topics: [
            { id: 601, name: 'Time, Speed and Distance', weight: 1.25, difficultyTag: 'medium' },
            { id: 602, name: 'Problems on Trains', weight: 1.25, difficultyTag: 'medium' },
            { id: 603, name: 'Boats and Stream', weight: 1.25, difficultyTag: 'medium' },
            { id: 604, name: 'Ranking & Ordering', weight: 1.0, difficultyTag: 'easy' },
            { id: 605, name: 'Data Sufficiency', weight: 1.5, difficultyTag: 'hard' },
            { id: 606, name: 'Statement & Argument', weight: 1.5, difficultyTag: 'hard' }
        ]
    }
];

// Get all milestones with topics
router.get('/', (req, res) => {
    res.json({ milestones });
});

// Get topics for a specific milestone
router.get('/topics', (req, res) => {
    const milestoneId = parseInt(req.query.milestoneId);
    const milestone = milestones.find(m => m.id === milestoneId);
    if (!milestone) {
        return res.status(404).json({ error: 'Milestone not found' });
    }
    res.json({
        milestoneId: milestone.id,
        milestoneName: milestone.name,
        topics: milestone.topics
    });
});

// Get single topic by ID
router.get('/topic/:topicId', (req, res) => {
    const topicId = parseInt(req.params.topicId);
    for (const milestone of milestones) {
        const topic = milestone.topics.find(t => t.id === topicId);
        if (topic) {
            return res.json({
                ...topic,
                milestoneId: milestone.id,
                milestoneName: milestone.name
            });
        }
    }
    res.status(404).json({ error: 'Topic not found' });
});

module.exports = router;

// Milestone data structure validation

// Error handling for milestones
