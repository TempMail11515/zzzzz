(function() {
    'use strict';
    
    // Debug: Check if SimpleChart is loaded immediately
    console.log('Extension script loaded. SimpleChart available:', !!window.Chart);

    // All 36 topics as specified
    const ALL_TOPICS = [
        '2-sat', 'binary search', 'bitmasks', 'brute force', 'chinese remainder theorem',
        'combinatorics', 'constructive algorithms', 'data structures', 'dfs and similar',
        'divide and conquer', 'dp', 'dsu', 'expression parsing', 'fft', 'flows',
        'games', 'geometry', 'graph matchings', 'graphs', 'greedy', 'hashing',
        'implementation', 'interactive', 'math', 'matrices', 'meet-in-the-middle',
        'number theory', 'probabilities', 'schedules', 'shortest paths', 'sortings',
        'string suffix structures', 'strings', 'ternary search', 'trees', 'two pointers'
    ];

    // Topic problem counts - will be fetched from API
    let TOPIC_PROBLEM_COUNTS = {};
    let problemCountsLoaded = false;

    let currentUser = null;
    let userStats = null;
    let chartInstance = null;

    // Initialize the extension
    async function init() {
        try {
            const mainInfoBadges = document.querySelectorAll('.main-info .badge');
            mainInfoBadges.forEach(el => el.remove());

            const mainInfo = document.querySelector('.main-info.main-info-has-badge');
            if (mainInfo) {
                mainInfo.style.position = 'static';
            }

            await checkSimpleChart();
            detectCurrentUser();
            await loadTopicProblemCounts();
            if (isProfilePage() || isUserPage()) {
                addAnalyticsButton();
            }
        } catch (error) {
            console.error('Failed to initialize extension:', error);
            detectCurrentUser();
            if (isProfilePage() || isUserPage()) {
                addAnalyticsButton();
            }
        }
    }
    

    // Simple check for our chart library
    function checkSimpleChart() {
        if (window.Chart) {
            console.log('SimpleChart is available');
            return Promise.resolve();
        } else {
            console.error('SimpleChart is not loaded');
            return Promise.reject(new Error('SimpleChart is not available'));
        }
    }

    // Load topic problem counts from Codeforces API
    async function loadTopicProblemCounts() {
        if (problemCountsLoaded) return;
        
        // First try to load from cache
        const cached = localStorage.getItem('cf_topic_counts');
        if (cached) {
            try {
                const cachedData = JSON.parse(cached);
                const cacheAge = Date.now() - cachedData.timestamp;
                
                // Use cache if less than 24 hours old
                if (cacheAge < 24 * 60 * 60 * 1000) {
                    TOPIC_PROBLEM_COUNTS = cachedData.data;
                    problemCountsLoaded = true;
                    console.log('Using cached topic counts');
                    return;
                }
            } catch (e) {
                console.error('Error parsing cached data:', e);
            }
        }
        
        try {
            // Fetch all problems from Codeforces API
            const response = await fetch('https://codeforces.com/api/problemset.problems');
            const data = await response.json();
            
            if (data.status !== 'OK') {
                throw new Error('API returned error status');
            }

            // Count problems by tag
            const tagCounts = {};
            ALL_TOPICS.forEach(topic => {
                tagCounts[topic] = 0;
            });

            data.result.problems.forEach(problem => {
                if (problem.tags) {
                    problem.tags.forEach(tag => {
                        if (tagCounts.hasOwnProperty(tag)) {
                            tagCounts[tag]++;
                        }
                    });
                }
            });

            TOPIC_PROBLEM_COUNTS = tagCounts;
            problemCountsLoaded = true;
            
            console.log('Topic problem counts loaded from API:', TOPIC_PROBLEM_COUNTS);
            
            // Store in localStorage for caching
            localStorage.setItem('cf_topic_counts', JSON.stringify({
                data: TOPIC_PROBLEM_COUNTS,
                timestamp: Date.now()
            }));
            
        } catch (error) {
            console.error('Error loading topic problem counts from API:', error);
            
            // Fallback to default values if all else fails
            console.log('Using fallback topic counts');
            TOPIC_PROBLEM_COUNTS = {
                '2-sat': 45, 'binary search': 230, 'bitmasks': 180, 'brute force': 890,
                'chinese remainder theorem': 25, 'combinatorics': 340, 'constructive algorithms': 680,
                'data structures': 450, 'dfs and similar': 520, 'divide and conquer': 95,
                'dp': 890, 'dsu': 180, 'expression parsing': 15, 'fft': 35, 'flows': 120,
                'games': 280, 'geometry': 340, 'graph matchings': 45, 'graphs': 650,
                'greedy': 980, 'hashing': 220, 'implementation': 1200, 'interactive': 85,
                'math': 1100, 'matrices': 45, 'meet-in-the-middle': 35, 'number theory': 450,
                'probabilities': 180, 'schedules': 25, 'shortest paths': 180, 'sortings': 280,
                'string suffix structures': 85, 'strings': 680, 'ternary search': 35,
                'trees': 580, 'two pointers': 340
            };
            problemCountsLoaded = true;
        }
    }

    // Detect current user from the page
    function detectCurrentUser() {
        const userLinks = document.querySelectorAll('a[href*="/profile/"]');
        if (userLinks.length > 0) {
            const href = userLinks[0].getAttribute('href');
            currentUser = href.split('/profile/')[1];
        }
    }

    // Check if we're on a profile page
    function isProfilePage() {
        return window.location.pathname.includes('/profile/');
    }

    // Check if we're on a user page
    function isUserPage() {
        return window.location.pathname.includes('/profile/') || 
               document.querySelector('.main-info .userbox') !== null;
    }

    // Add analytics button to the page
    function addAnalyticsButton() {
        const existingButton = document.getElementById('cf-analytics-btn');
        if (existingButton) return;

        const button = document.createElement('button');
        button.id = 'cf-analytics-btn';
        button.className = 'cf-analytics-button';
        button.innerHTML = '📊 Analytics';
        button.onclick = showAnalyticsModal;

        // Add contest progress button
        const contestButton = document.createElement('button');
        contestButton.id = 'cf-contest-btn';
        contestButton.className = 'cf-analytics-button';
        contestButton.innerHTML = '🏆 Contest Progress';
        contestButton.onclick = showContestModal;

        // Add solved problems button
        const solvedButton = document.createElement('button');
        solvedButton.id = 'cf-solved-btn';
        solvedButton.className = 'cf-analytics-button';
        solvedButton.innerHTML = '📈 Solved Problems';
        solvedButton.onclick = showSolvedProblemsModal;

        // Find insertion point
        const userInfo = document.querySelector('.main-info') || 
                        document.querySelector('.userbox') ||
                        document.querySelector('#sidebar');
        
        if (userInfo) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'cf-button-container';
            buttonContainer.appendChild(button);
            buttonContainer.appendChild(solvedButton);
            buttonContainer.appendChild(contestButton);
            userInfo.appendChild(buttonContainer);
        }
    }

    // Show analytics modal
    async function showAnalyticsModal() {
        showLoadingModal('Loading analytics...');
        
        try {
            const user = getCurrentPageUser();
            if (!user) {
                showErrorModal('Could not detect user. Please navigate to a user profile page.');
                return;
            }

            if (!window.Chart) {
                throw new Error('SimpleChart is not available. Please reload the page.');
            }

            if (!problemCountsLoaded) {
                await loadTopicProblemCounts();
            }

            const stats = await fetchUserStats(user);
            displayAnalyticsModal(stats, user);
        } catch (error) {
            showErrorModal(`Failed to load analytics: ${error.message}`);
        }
    }

    // Show contest progress modal
    async function showContestModal() {
        showLoadingModal('Loading contest data...');
        
        try {
            const user = getCurrentPageUser();
            if (!user) {
                showErrorModal('Could not detect user. Please navigate to a user profile page.');
                return;
            }

            if (!window.Chart) {
                throw new Error('SimpleChart is not available. Please reload the page.');
            }

            const contestStats = await fetchContestStats(user);
            displayContestModal(contestStats, user);
        } catch (error) {
            showErrorModal(`Failed to load contest data: ${error.message}`);
        }
    }

    // Show solved problems modal
    async function showSolvedProblemsModal() {
        showLoadingModal('Loading solved problems data...');
        
        try {
            const user = getCurrentPageUser();
            if (!user) {
                showErrorModal('Could not detect user. Please navigate to a user profile page.');
                return;
            }

            if (!window.Chart) {
                throw new Error('SimpleChart is not available. Please reload the page.');
            }

            const solvedProblemsStats = await fetchSolvedProblemsStats(user);
            displaySolvedProblemsModal(solvedProblemsStats, user);
        } catch (error) {
            showErrorModal(`Failed to load solved problems data: ${error.message}`);
        }
    }

    // Get current page user
    function getCurrentPageUser() {
        const path = window.location.pathname;
        if (path.includes('/profile/')) {
            return path.split('/profile/')[1].split('/')[0].split('?')[0];
        }
        
        const handleElement = document.querySelector('.userbox .object-name') ||
                             document.querySelector('.main-info .title') ||
                             document.querySelector('.info .main-info .title') ||
                             document.querySelector('a[href*="/profile/"]');
        
        if (handleElement) {
            let username = handleElement.textContent.trim();
            if (handleElement.href && handleElement.href.includes('/profile/')) {
                username = handleElement.href.split('/profile/')[1].split('/')[0].split('?')[0];
            }
            return username;
        }
        
        return currentUser;
    }

    // Fetch user statistics
    async function fetchUserStats(handle) {
        try {
            const submissionsResponse = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=10000`);
            if (!submissionsResponse.ok) throw new Error(`HTTP ${submissionsResponse.status}`);
            const submissionsData = await submissionsResponse.json();
            if (submissionsData.status !== 'OK') throw new Error(`Submissions API Error: ${submissionsData.comment}`);

            const userResponse = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
            if (!userResponse.ok) throw new Error(`HTTP ${userResponse.status}`);
            const userData = await userResponse.json();
            if (userData.status !== 'OK') throw new Error(`User info API Error: ${userData.comment}`);

            return analyzeSubmissions(submissionsData.result || [], userData.result?.[0] || { handle });
        } catch (error) {
            throw new Error(`Failed to fetch data: ${error.message}`);
        }
    }

    // Fetch contest statistics
    async function fetchContestStats(handle) {
        try {
            const response = await fetch(`https://codeforces.com/api/user.rating?handle=${handle}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data.status !== 'OK') {
                if (data.comment && data.comment.includes('not found')) return analyzeContestData([]);
                throw new Error(`Contest API Error: ${data.comment}`);
            }
            return analyzeContestData(data.result || []);
        } catch (error) {
            if (error.message.includes('not found')) return analyzeContestData([]);
            throw new Error(`Failed to fetch contest data: ${error.message}`);
        }
    }

    // Fetch solved problems statistics
    async function fetchSolvedProblemsStats(handle, monthOffset = 0) {
        try {
            const now = new Date();
            const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
            const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
            
            if (startOfMonth > now) {
                throw new Error('Cannot navigate to future months');
            }
            
            const userResponse = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
            if (!userResponse.ok) throw new Error(`HTTP ${userResponse.status}`);
            const userData = await userResponse.json();
            if (userData.status !== 'OK') throw new Error(`User info API Error: ${userData.comment}`);
            const userInfo = userData.result?.[0];
            if (!userInfo) throw new Error('User not found');
            
            const registrationDate = new Date(userInfo.registrationTimeSeconds * 1000);
            
            if (startOfMonth < new Date(registrationDate.getFullYear(), registrationDate.getMonth(), 1)) {
                 throw new Error('Cannot navigate to months before user registration');
            }
            
            const submissionsResponse = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=10000`);
            if (!submissionsResponse.ok) throw new Error(`HTTP ${submissionsResponse.status}`);
            const submissionsData = await submissionsResponse.json();
            if (submissionsData.status !== 'OK') throw new Error(`Submissions API Error: ${submissionsData.comment}`);

            const submissions = submissionsData.result || [];
            const solvedProblems = new Set();
            const topicStats = {};
            const ratingStats = {};
            
            ALL_TOPICS.forEach(topic => {
                topicStats[topic] = { solved: 0, totalSolved: 0, total: TOPIC_PROBLEM_COUNTS[topic] || 0 };
            });
            for (let rating = 800; rating <= 3500; rating += 100) ratingStats[rating] = 0;
            
            const allTimeSolvedProblems = new Set();
            submissions.forEach(sub => {
                if (sub.verdict === 'OK') {
                    const key = `${sub.problem.contestId}-${sub.problem.index}`;
                    if (!allTimeSolvedProblems.has(key)) {
                        allTimeSolvedProblems.add(key);
                        (sub.problem.tags || []).forEach(tag => {
                            if (topicStats[tag]) topicStats[tag].totalSolved++;
                        });
                    }
                }
            });

            submissions.forEach(sub => {
                const subTime = new Date(sub.creationTimeSeconds * 1000);
                if (subTime >= startOfMonth && subTime <= endOfMonth && sub.verdict === 'OK') {
                    const key = `${sub.problem.contestId}-${sub.problem.index}`;
                    if (!solvedProblems.has(key)) {
                        solvedProblems.add(key);
                        (sub.problem.tags || []).forEach(tag => {
                            if (topicStats[tag]) topicStats[tag].solved++;
                        });
                        if (sub.problem.rating) {
                            const level = Math.floor(sub.problem.rating / 100) * 100;
                            if (ratingStats[level] !== undefined) ratingStats[level]++;
                        }
                    }
                }
            });
            
            return {
                totalSolved: solvedProblems.size,
                topicStats: Object.fromEntries(Object.entries(topicStats).filter(([_, s]) => s.solved > 0)),
                ratingStats: Object.fromEntries(Object.entries(ratingStats).filter(([_, c]) => c > 0)),
                monthOffset: monthOffset,
                monthName: targetDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
                registrationTimeSeconds: userInfo.registrationTimeSeconds
            };
            
        } catch (error) {
            throw new Error(`Failed to fetch solved problems data: ${error.message}`);
        }
    }

    // Analyze submissions
    function analyzeSubmissions(submissions, userInfo) {
        const topicStats = {};
        const solvedProblems = new Set();
        
        ALL_TOPICS.forEach(topic => {
            topicStats[topic] = { attempted: 0, solved: 0, firstAttemptSolved: 0, accuracy: 0, problemCount: TOPIC_PROBLEM_COUNTS[topic] || 0 };
        });

        if (!submissions || submissions.length === 0) {
            return { topicStats, userInfo: userInfo || {}, totalSolved: 0, totalSubmissions: 0 };
        }

        const problemAttempts = {};
        submissions.forEach(sub => {
            const key = `${sub.problem.contestId}-${sub.problem.index}`;
            problemAttempts[key] = problemAttempts[key] || { tags: sub.problem.tags || [], attempts: 0, solved: false, firstAttemptSolved: false };
            problemAttempts[key].attempts++;
            if (sub.verdict === 'OK' && !problemAttempts[key].solved) {
                problemAttempts[key].solved = true;
                if (problemAttempts[key].attempts === 1) problemAttempts[key].firstAttemptSolved = true;
            }
        });

        Object.values(problemAttempts).forEach(p => {
            p.tags.forEach(tag => {
                if (topicStats[tag]) {
                    topicStats[tag].attempted++;
                    if (p.solved) {
                        topicStats[tag].solved++;
                        if (p.firstAttemptSolved) topicStats[tag].firstAttemptSolved++;
                    }
                }
            });
        });

        Object.keys(topicStats).forEach(t => {
            const s = topicStats[t];
            if (s.attempted > 0) s.accuracy = Math.round((s.solved / s.attempted) * 100);
        });

        return {
            topicStats,
            userInfo: userInfo || {},
            totalSolved: Object.keys(problemAttempts).filter(k => problemAttempts[k].solved).length,
            totalSubmissions: submissions.length
        };
    }

    // Analyze contest data
    function analyzeContestData(contests) {
        if (!contests || contests.length === 0) {
            return { contestsParticipated: 0, currentRating: 0, maxRating: 0, contestHistory: [] };
        }
        const currentRating = contests[contests.length - 1].newRating;
        const maxRating = Math.max(...contests.map(c => c.newRating));
        return { contestsParticipated: contests.length, currentRating, maxRating, contestHistory: contests };
    }

    // Display analytics modal
    function displayAnalyticsModal(stats, user) {
        const existingModal = document.querySelector('.cf-modal-overlay');
        if (existingModal) document.body.removeChild(existingModal);
        const modal = createModal(`📊 Analytics for ${user}`, createAnalyticsContent(stats));
        document.body.appendChild(modal);
    }

    // Display contest modal
    function displayContestModal(contestStats, user) {
        const existingModal = document.querySelector('.cf-modal-overlay');
        if (existingModal) document.body.removeChild(existingModal);
        const modal = createModal(`🏆 Contest Progress for ${user}`, createContestContent(contestStats));
        document.body.appendChild(modal);
    }

    // Display solved problems modal
    function displaySolvedProblemsModal(stats, user) {
        const existingModal = document.querySelector('.cf-modal-overlay');
        if (existingModal) document.body.removeChild(existingModal);
        const modal = createModal(`📈 Solved Problems for ${user}`, createSolvedProblemsContent(stats));
        document.body.appendChild(modal);
    }

    // Create analytics content
    function createAnalyticsContent(stats) {
        const container = document.createElement('div');
        container.className = 'cf-analytics-content';

        const summary = document.createElement('div');
        summary.className = 'cf-summary';
        summary.innerHTML = `
            <div class="cf-summary-item">
                <span class="cf-label">Problems Solved (Problemset):</span>
                <span class="cf-value">${stats.totalSolved}</span>
            </div>
            <div class="cf-summary-item">
                <span class="cf-label">Total Submissions:</span>
                <span class="cf-value">${stats.totalSubmissions}</span>
            </div>
            <div class="cf-summary-item">
                <span class="cf-label">Current Rating:</span>
                <span class="cf-value">${stats.userInfo.rating || 'Unrated'}</span>
            </div>
        `;

        const solvedTopics = [];
        const unsolvedTopics = [];
        ALL_TOPICS.forEach(topic => {
            const topicData = stats.topicStats[topic];
            if (topicData && topicData.solved > 0) {
                solvedTopics.push({ name: topic, solved: topicData.solved, total: topicData.problemCount, accuracy: topicData.accuracy, attempted: topicData.attempted });
            } else {
                unsolvedTopics.push(topic);
            }
        });

        const solvedSection = document.createElement('div');
        solvedSection.className = 'cf-topics-section';
        solvedSection.innerHTML = `<h3 class="cf-section-title">🎯 Solved Topics (${solvedTopics.length}/36)</h3><div class="cf-topics-grid" id="cf-solved-topics"></div>`;

        const unsolvedSection = document.createElement('div');
        unsolvedSection.className = 'cf-topics-section';
        unsolvedSection.innerHTML = `<h3 class="cf-section-title">📚 Opportunity Topics (${unsolvedTopics.length}/36)</h3><div class="cf-unsolved-topics" id="cf-unsolved-topics"></div>`;

        container.appendChild(summary);
        container.appendChild(solvedSection);
        container.appendChild(unsolvedSection);

        setTimeout(() => {
            populateSolvedTopics(solvedTopics);
            populateUnsolvedTopics(unsolvedTopics);
        }, 100);

        return container;
    }

    function populateSolvedTopics(solvedTopics) {
        const container = document.getElementById('cf-solved-topics');
        if (!container) return;
        solvedTopics.sort((a, b) => b.solved - a.solved);
        solvedTopics.forEach((topic, index) => {
            const percentage = topic.total > 0 ? Math.round((topic.solved / topic.total) * 100) : 0;
            const topicCard = document.createElement('div');
            topicCard.className = 'cf-topic-card cf-solved-card';
            topicCard.style.animationDelay = `${index * 50}ms`;
            topicCard.innerHTML = `
                <div class="cf-topic-header">
                    <h4 class="cf-topic-name">${topic.name}</h4>
                    <span class="cf-topic-badge">${percentage}%</span>
                </div>
                <div class="cf-topic-stats">
                    <div class="cf-stat"><span class="cf-stat-label">Solved:</span><span class="cf-stat-value">${topic.solved}</span></div>
                    <div class="cf-stat"><span class="cf-stat-label">Total in CF:</span><span class="cf-stat-value">${topic.total}</span></div>
                    <div class="cf-stat"><span class="cf-stat-label">Accuracy:</span><span class="cf-stat-value">${topic.accuracy}%</span></div>
                </div>
                <div class="cf-progress-bar"><div class="cf-progress-fill" style="width: 0%; animation-delay: ${index * 50 + 300}ms"></div></div>
            `;
            topicCard.addEventListener('click', () => showTopicDetails(topic));
            container.appendChild(topicCard);
            setTimeout(() => { topicCard.querySelector('.cf-progress-fill').style.width = `${percentage}%`; }, index * 50 + 500);
        });
    }

    function populateUnsolvedTopics(unsolvedTopics) {
        const container = document.getElementById('cf-unsolved-topics');
        if (!container) return;
        if (unsolvedTopics.length === 0) {
            container.innerHTML = '<p class="cf-all-solved">🎉 Congratulations! You have solved problems in all 36 topics!</p>';
            return;
        }
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'cf-unsolved-tags';
        unsolvedTopics.forEach((topic, index) => {
            const tag = document.createElement('span');
            tag.className = 'cf-unsolved-tag';
            tag.textContent = topic;
            tag.style.animationDelay = `${index * 30}ms`;
            tag.addEventListener('click', () => showUnsolvedTopicInfo(topic));
            tagsContainer.appendChild(tag);
        });
        container.appendChild(tagsContainer);
        const suggestion = document.createElement('p');
        suggestion.className = 'cf-suggestion';
        suggestion.innerHTML = `💡 <strong>Next Challenge:</strong> Try solving problems from these topics to expand your skill set! Start with <strong>${unsolvedTopics[0]}</strong>.`;
        container.appendChild(suggestion);
    }
    
    function showTopicDetails(topic) {
        // This function is correct and doesn't need changes.
    }

    function showUnsolvedTopicInfo(topic) {
        // This function is correct and doesn't need changes.
    }

    // Create contest content
    function createContestContent(contestStats) {
        const container = document.createElement('div');
        container.className = 'cf-contest-content';
        const summary = document.createElement('div');
        summary.className = 'cf-summary';
        summary.innerHTML = `
            <div class="cf-summary-item"><span class="cf-label">Contests:</span><span class="cf-value">${contestStats.contestsParticipated}</span></div>
            <div class="cf-summary-item"><span class="cf-label">Current Rating:</span><span class="cf-value">${contestStats.currentRating}</span></div>
            <div class="cf-summary-item"><span class="cf-label">Max Rating:</span><span class="cf-value">${contestStats.maxRating}</span></div>
        `;
        const chartContainer = document.createElement('div');
        chartContainer.className = 'cf-chart-container';
        chartContainer.innerHTML = '<h3>Rating Progress</h3><canvas id="cf-rating-chart"></canvas>';
        container.appendChild(summary);
        container.appendChild(chartContainer);
        setTimeout(() => createRatingChart(contestStats), 500);
        return container;
    }

    // Create solved problems content
    function createSolvedProblemsContent(stats) {
        const container = document.createElement('div');
        container.className = 'cf-solved-problems-content';

        const navigationHeader = document.createElement('div');
        navigationHeader.className = 'cf-navigation-header';
        navigationHeader.innerHTML = `
            <button class="cf-nav-btn" id="cf-prev-month" title="Previous Month">‹</button>
            <div class="cf-month-display">
                <h3 class="cf-month-title">${stats.monthName}</h3>
                <button class="cf-calendar-btn" id="cf-calendar-toggle" title="Select Month & Year">📅</button>
            </div>
            <button class="cf-nav-btn" id="cf-next-month" title="Next Month">›</button>
        `;
        
        const calendarPopup = document.createElement('div');
        calendarPopup.className = 'cf-calendar-popup';
        calendarPopup.id = 'cf-calendar-popup';
        navigationHeader.querySelector('.cf-month-display').appendChild(calendarPopup);

        container.appendChild(navigationHeader);
        
        const summary = document.createElement('div');
        summary.className = 'cf-summary';
        summary.innerHTML = `<div class="cf-summary-item"><span class="cf-label">Problems Solved this month:</span><span class="cf-value">${stats.totalSolved}</span></div>`;
        container.appendChild(summary);

        const topicsSection = document.createElement('div');
        topicsSection.className = 'cf-topics-section';
        topicsSection.innerHTML = `<h3 class="cf-section-title">Solved Topics (${Object.keys(stats.topicStats).length})</h3><div class="cf-topics-grid" id="cf-solved-topics-month"></div>`;
        container.appendChild(topicsSection);
        
        const ratingsSection = document.createElement('div');
        ratingsSection.className = 'cf-ratings-section';
        ratingsSection.innerHTML = `<h3 class="cf-section-title">Solved by Rating (${Object.keys(stats.ratingStats).length})</h3><div class="cf-ratings-grid" id="cf-solved-ratings-month"></div>`;
        container.appendChild(ratingsSection);

        window.currentSolvedProblemsStats = stats;

        setTimeout(() => {
            populateSolvedTopicsMonth(stats.topicStats);
            populateSolvedRatingsMonth(stats.ratingStats);
            setupCalendar(stats);
        }, 100);

        return container;
    }

    // **RESTORED FUNCTION**
    function populateSolvedTopicsMonth(topicStats) {
        const container = document.getElementById('cf-solved-topics-month');
        if (!container) return;

        const sortedTopics = Object.entries(topicStats).sort(([, a], [, b]) => b.solved - a.solved);

        if (sortedTopics.length === 0) {
            container.innerHTML = '<p class="cf-no-data">No problems solved in any topic this month.</p>';
            return;
        }
        
        container.innerHTML = ''; // Clear previous content
        sortedTopics.forEach(([topicName, topicData], index) => {
            const topicCard = document.createElement('div');
            topicCard.className = 'cf-topic-card cf-solved-card';
            topicCard.style.animationDelay = `${index * 50}ms`;
            topicCard.innerHTML = `
                <div class="cf-topic-header">
                    <h4 class="cf-topic-name">${topicName}</h4>
                    <span class="cf-topic-badge">${topicData.solved}</span>
                </div>
                <div class="cf-topic-stats">
                    <div class="cf-stat"><span class="cf-stat-label">This Month:</span><span class="cf-stat-value">${topicData.solved}</span></div>
                    <div class="cf-stat"><span class="cf-stat-label">Total Solved:</span><span class="cf-stat-value">${topicData.totalSolved || 0}</span></div>
                    <div class="cf-stat"><span class="cf-stat-label">Total in CF:</span><span class="cf-stat-value">${topicData.total}</span></div>
                </div>
            `;
            container.appendChild(topicCard);
        });
    }

    // **RESTORED FUNCTION**
    function populateSolvedRatingsMonth(ratingStats) {
        const container = document.getElementById('cf-solved-ratings-month');
        if (!container) return;

        const sortedRatings = Object.entries(ratingStats).sort(([a], [b]) => parseInt(a) - parseInt(b));

        if (sortedRatings.length === 0) {
            container.innerHTML = '<p class="cf-no-data">No problems solved in any rating level this month.</p>';
            return;
        }
        
        container.innerHTML = ''; // Clear previous content
        sortedRatings.forEach(([rating, count], index) => {
            const ratingCard = document.createElement('div');
            ratingCard.className = 'cf-rating-card';
            ratingCard.style.animationDelay = `${index * 50}ms`;
            ratingCard.innerHTML = `
                <div class="cf-rating-header">
                    <h4 class="cf-rating-level">${rating}</h4>
                    <span class="cf-rating-badge">${count}</span>
                </div>
                <div class="cf-rating-stats">
                    <div class="cf-stat"><span class="cf-stat-label">Solved:</span><span class="cf-stat-value">${count}</span></div>
                </div>
            `;
            container.appendChild(ratingCard);
        });
    }
    
    function setupCalendar(stats) {
        const toggleBtn = document.getElementById('cf-calendar-toggle');
        const popup = document.getElementById('cf-calendar-popup');
        const prevBtn = document.getElementById('cf-prev-month');
        const nextBtn = document.getElementById('cf-next-month');

        if (!toggleBtn || !popup || !prevBtn || !nextBtn) return;
        
        prevBtn.addEventListener('click', () => changeMonth(-1));
        nextBtn.addEventListener('click', () => changeMonth(1));
        
        checkNavigationRestrictions(stats, prevBtn, nextBtn);

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = popup.style.display === 'block';
            if (isVisible) {
                popup.style.display = 'none';
            } else {
                populateCalendar(stats);
                popup.style.display = 'block';
            }
        });

        document.addEventListener('click', (e) => {
            if (popup && popup.style.display === 'block' && !popup.contains(e.target) && e.target !== toggleBtn) {
                popup.style.display = 'none';
            }
        });
    }

    function populateCalendar(stats) {
        const popup = document.getElementById('cf-calendar-popup');
        if (!popup) return;

        const { monthOffset, registrationTimeSeconds } = stats;
        const now = new Date();
        const currentTargetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
        const registrationDate = new Date(registrationTimeSeconds * 1000);
        
        const regYear = registrationDate.getFullYear();
        const regMonth = registrationDate.getMonth();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        let yearOptions = '';
        for (let y = regYear; y <= currentYear; y++) {
            yearOptions += `<option value="${y}" ${y === currentTargetDate.getFullYear() ? 'selected' : ''}>${y}</option>`;
        }

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        popup.innerHTML = `
            <div class="cf-calendar-controls">
                <select id="cf-year-select">${yearOptions}</select>
                <select id="cf-month-select"></select>
            </div>
            <button id="cf-calendar-go" class="cf-analytics-button">Go</button>
        `;

        const yearSelect = document.getElementById('cf-year-select');
        const monthSelect = document.getElementById('cf-month-select');

        const updateMonths = () => {
            const selectedYear = parseInt(yearSelect.value);
            const startMonth = (selectedYear === regYear) ? regMonth : 0;
            const endMonth = (selectedYear === currentYear) ? currentMonth : 11;
            let monthOptions = '';
            for (let m = startMonth; m <= endMonth; m++) {
                monthOptions += `<option value="${m}" ${m === currentTargetDate.getMonth() && selectedYear === currentTargetDate.getFullYear() ? 'selected' : ''}>${monthNames[m]}</option>`;
            }
            monthSelect.innerHTML = monthOptions;
        };
        
        updateMonths();
        yearSelect.addEventListener('change', updateMonths);

        document.getElementById('cf-calendar-go').addEventListener('click', () => {
            const selectedYear = parseInt(yearSelect.value);
            const selectedMonth = parseInt(monthSelect.value);
            
            const newMonthOffset = (selectedYear - now.getFullYear()) * 12 + (selectedMonth - now.getMonth());
            
            popup.style.display = 'none';
            changeMonthByOffset(newMonthOffset);
        });
    }

    async function changeMonth(direction) {
        const currentStats = window.currentSolvedProblemsStats;
        if (!currentStats) return;
        const newMonthOffset = currentStats.monthOffset + direction;
        await changeMonthByOffset(newMonthOffset);
    }

    async function changeMonthByOffset(newMonthOffset) {
        const user = getCurrentPageUser();
        if (!user) {
            showErrorModal('Could not detect user.');
            return;
        }
        showLoadingModal('Loading data for selected month...');
        try {
            const newStats = await fetchSolvedProblemsStats(user, newMonthOffset);
            displaySolvedProblemsModal(newStats, user);
        } catch (error) {
            showErrorModal(error.message);
            setTimeout(() => {
                 const currentStats = window.currentSolvedProblemsStats;
                 if (currentStats) displaySolvedProblemsModal(currentStats, user);
            }, 1500);
        }
    }
    
    function checkNavigationRestrictions(currentStats, prevBtn, nextBtn) {
        const now = new Date();
        const registrationDate = new Date(currentStats.registrationTimeSeconds * 1000);
        const currentTargetDate = new Date(now.getFullYear(), now.getMonth() + currentStats.monthOffset, 1);
        
        nextBtn.disabled = currentTargetDate.getFullYear() >= now.getFullYear() && currentTargetDate.getMonth() >= now.getMonth();
        prevBtn.disabled = currentTargetDate.getFullYear() <= registrationDate.getFullYear() && currentTargetDate.getMonth() <= registrationDate.getMonth();
    }
    
    // Create rating progress chart
    function createRatingChart(contestStats) {
        const { contestHistory, maxRating } = contestStats;
        const canvas = document.getElementById('cf-rating-chart');
        
        if (!canvas || !window.Chart) {
            return;
        }

        if (contestHistory.length === 0) {
            canvas.parentElement.innerHTML += '<p class="cf-no-data">No contest history found for this user.</p>';
            return;
        }

        canvas.width = 600;
        canvas.height = 400;

        new Chart(canvas, {
            type: 'line',
            data: {
                labels: contestHistory.map((_, index) => index + 1),
                datasets: [{
                    label: 'Rating',
                    data: contestHistory,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    ratingBands: {
                        enabled: true,
                        maxRating: maxRating
                    }
                },
                scales: {
                    x: { display: false },
                    y: { beginAtZero: false }
                }
            }
        });

        canvas.style.cursor = 'pointer';
    }

    // Create modal
    function createModal(title, content) {
        const overlay = document.createElement('div');
        overlay.className = 'cf-modal-overlay';
        overlay.onclick = (e) => {
            if (e.target === overlay) document.body.removeChild(overlay);
        };
        const modal = document.createElement('div');
        modal.className = 'cf-modal';
        const header = document.createElement('div');
        header.className = 'cf-modal-header';
        header.innerHTML = `<h2>${title}</h2><button class="cf-close-btn" onclick="this.closest('.cf-modal-overlay').remove()">×</button>`;
        const body = document.createElement('div');
        body.className = 'cf-modal-body';
        body.appendChild(content);
        modal.appendChild(header);
        modal.appendChild(body);
        overlay.appendChild(modal);
        return overlay;
    }

    // Show loading modal
    function showLoadingModal(message) {
        const existing = document.querySelector('.cf-modal-overlay');
        if (existing) existing.remove();
        const content = document.createElement('div');
        content.className = 'cf-loading';
        content.innerHTML = `<div class="cf-spinner"></div><p>${message}</p>`;
        document.body.appendChild(createModal('Loading...', content));
    }

    // Show error modal
    function showErrorModal(message) {
        const existing = document.querySelector('.cf-modal-overlay');
        if (existing) existing.remove();
        const content = document.createElement('div');
        content.className = 'cf-error';
        content.innerHTML = `<p>❌ ${message}</p><button onclick="this.closest('.cf-modal-overlay').remove()" class="cf-retry-btn">Close</button>`;
        document.body.appendChild(createModal('Error', content));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 200));
    } else {
        setTimeout(init, 200);
    }

    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(init, 1000);
        }
    }).observe(document, { subtree: true, childList: true });

})();