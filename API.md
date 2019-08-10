# API documentation

This is not intended to cover whole API.

All responses come in JSON format.

### Login endpoint
- URL: /api/login
- Method: POST
- Data params: email, password
- Response: success (boolean), role, id, token

Example:
```bash
curl -X POST -d email="riski@example.com" -d password="password" https://rekisteri.asteriski.fi/api/login
```
You can use response data to query member details.

### Member details endpoint
- URL: /api/member/details
- Method: GET
- URL params: memberID (id in login response)
- Headers: Authorization (token in login response)
- Response: Member object

Example:
```bash
curl -X GET -H "Authorization: JWT 1234abcd" "https://rekisteri.asteriski.fi/api/member/details?memberID=123"
```
### All members endpoint
- URL: /api/admin/list
- Method: GET
- URL params: id (id in login response), access (role in login response)
- Headers: Authorization (token in login response)
- Response: Array of member objects
- Other: id must be someone with Admin/Board privileges

Example:
```bash
curl -X GET -H "Authorization: JWT 1234abcd" "https://rekisteri.asteriski.fi/api/admin/list?id=1234&access=Admin"
```
