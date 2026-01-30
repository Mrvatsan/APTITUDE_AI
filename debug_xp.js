const http = require('http');

const username = `debug_${Date.now()}`;
const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('Register Response Status:', res.statusCode);
        const authData = JSON.parse(data);

        if (authData.token) {
            // Now get profile
            const profileOptions = {
                hostname: 'localhost',
                port: 3000,
                path: '/api/auth/profile',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authData.token}`
                }
            };
            const req2 = http.request(profileOptions, (res2) => {
                let data2 = '';
                res2.on('data', (chunk) => { data2 += chunk; });
                res2.on('end', () => {
                    console.log('Profile Response:', data2);
                });
            });
            req2.end();
        } else {
            console.log('Registration failed', authData);
        }
    });
});

req.write(JSON.stringify({ username, password: 'password123', email: 'test@example.com' }));
req.end();
