*** Settings ***
Library         HttpLibrary.HTTP
Library         String
#Library          RequestsLibrary

*** Variables ***
${newUser}  firstName=Testi&lastName=Testinen&utuAccount=tetete&email=tetete@utu.fi&hometown=Testilä
${payment}  account=foo&algorithm=bar&amount=20&stamp=[STAMP]&reference=foofoo&transactionId=barbar&status=ok&provider=OP&signature=lol
${memberEmail}  tetete@utu.fi


*** Test Cases ***
Application is online
    Create HTTP Context                     host.docker.internal:3001
    GET                                     /   
    Response Status Code Should Equal       200

No resource is given when not logged in
    Next Request Should Not Succeed
    GET                                     /api/member/details
    Response Status Code Should Equal       401

User creation from register works
    Set request body                        ${newUser}
    POST                                    /api/register/
    Response Status Code Should Equal       200
    ${body}=    Get Response Body
    ${escapedBody}=  String.Decode Bytes To String  ${body}  ASCII  errors=ignore
    Should Contain  ${escapedBody}  luotu onnistuneesti
    ${memberId}=    Get Json Value  ${escapedBody}  /memberId
    ${memberId}=    Replace String  ${memberId}  "  ${EMPTY}
    Set Suite Variable  ${MEMBER_ID}  ${memberId}

Payment eg whole registration works
    Set request body                        memberId=${memberId}&productId=1111
    POST                                    /api/pay
    Response Status Code Should Equal       200
    ${body}=    Get Response Body
    ${paymentStamp}=  Replace String  ${body}  "  ${EMPTY}
    ${paymentBody}=  Replace String  ${payment}  [STAMP]  ${paymentStamp}
    Set request body                        ${paymentBody}
    POST                                    /api/pay/payment-return
    Response Status Code Should Equal       200
    ${body}=    Get Response Body
    ${escapedBody}=  String.Decode Bytes To String  ${body}  ASCII  errors=ignore
    Should Contain  ${escapedBody}  Maksun ksittely onnistui.
    ${memberPassword}=  Get Json Value  ${escapedBody}  /password
    ${memberPassword}=  Replace String  ${memberPassword}  "  ${EMPTY}
    Set Suite Variable  ${MEMBER_PASSWORD}  ${memberPassword}

Login works
    Set request body  email=${memberEmail}&password=${MEMBER_PASSWORD}
    POST  /api/login
    Response Status Code Should Equal  200
    Response Body Should Contain  token
    ${body}=  Get Response Body
    ${token}=  Get Json Value  ${body}  /token
    ${token}=  Replace String  ${token}  "  ${EMPTY}
    Set Suite Variable  ${MEMBER_TOKEN}  ${token}

See members own details while logged in
    Set request header  Authorization  ${MEMBER_TOKEN}
    Set request header  Content-Type  application/json
    GET  /api/member/details?memberID=${MEMBER_ID}
    Response Status Code Should Equal  200
    ${body}=    Get Response Body
    ${escapedBody}=  String.Decode Bytes To String  ${body}  ASCII  errors=ignore
    Should Contain  ${escapedBody}  ${MEMBER_ID} 



