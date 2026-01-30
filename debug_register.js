const http = require('http');

const data = JSON.stringify({
    username: 'debug_user_' + Date.now(),
    password: 'password123',
    goal: 'placements',
    selectedMilestones: [1, 2]
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', body);
    });
});

req.on('error', error => {
    console.error(error);
});

req.write(data);
req.end();
