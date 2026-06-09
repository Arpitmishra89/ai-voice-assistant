import { Paper } from '@mui/material'
import pxToRem from 'assets/theme/functions/pxToRem'
import FNAvatar from 'components/FNAvatar/FNAvatar'
import FNBox from 'components/FNBox/FNBox'
import FNButton from 'components/FNButton/FNButton'
import FNTypography from 'components/FNTypography/FNTypography'
import React, { useEffect, useState } from 'react'
import LocalStorageService from '../../utils/LocalStorageService'
import ChatIcon from './assets/chat_icon.png'
import { useNavigate } from 'react-router-dom'
import commonUtil from '../../utils/CommonUtil'
import { CHAT_BOT_EVENTS } from '../../utils/Constants'

const AlgoflowChatBot = ({ firstName, emailID, mobileNo, setOpenDrawer = () => {
}, city }) => {
    let mobile = mobileNo || LocalStorageService.getMobileNumber();
    let email = emailID || LocalStorageService.getEmailID();
    const token = LocalStorageService.getAccessToken();

    const [scriptLoaded, setScriptLoaded] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const handleMessage = (event) => {

            if (event.data?.type === CHAT_BOT_EVENTS.CHATBOT_REDIRECT_CLOSE_LOAN) {
                if (!window.__chatRedirecting) {
                    window.__chatRedirecting = true;

                    window.MyChatWidget?.close();
                    navigate(event.data.route, { state: { loanAccountNo: event.data.loanAccountNo, eventType: event.data.type } });

                    setTimeout(() => {
                        window.__chatRedirecting = false;
                    }, 1000);
                    setOpenDrawer(false);
                }
            }

            if (event.data?.type === CHAT_BOT_EVENTS.DOWNLOAD_DOCUMENT && event.data?.documentUrl) {
                commonUtil.downloadFile(
                    event.data.documentUrl,
                    event.data.documentName || 'document'
                )
            }
        }

        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [navigate, setOpenDrawer])

    const handleCustomerSupport = () => {

        const chatUrl = process.env.REACT_APP_Algoflow_CHATBOT_URL;

        if (window.MyChatWidget) {
            window.MyChatWidget({
                name: firstName,
                email: email,
                mobile: mobile,
                url: chatUrl,
                token: token,
                city: city
            })
            return;
        }

        if (!scriptLoaded) {
            const existingScript = document.querySelector(`script[src="${chatUrl}chat-widget.js"]`);
            if (existingScript) {
                return;
            }

            const script = document.createElement('script')
            script.src = chatUrl + 'chat-widget.js'
            script.async = true

            script.onload = () => {
                setScriptLoaded(true)

                window.MyChatWidget?.({
                    name: firstName,
                    email: email,
                    mobile: mobile,
                    url: chatUrl,
                    token: token,
                    city: city
                })
            }

            script.onerror = () => {
                console.error('Failed to load chat widget script')
                setScriptLoaded(false)
                script.remove()
            }

            document.body.appendChild(script)
        } else {
            window.MyChatWidget?.({
                name: firstName,
                email: email,
                mobile: mobile,
                url: chatUrl,
                token: token,
                city: city
            })
        }
    }

    return (
        <>
            <Paper style={{ width: '100%', borderRadius: 20, backgroundColor: 'white', boxShadow: "0px 4px 35px rgba(0, 0, 0, 0.08)", marginTop: pxToRem(8), marginBottom: pxToRem(8) }} elevation={2}>
                <FNBox py={pxToRem(12)} px={pxToRem(12)} display="flex" justifyContent="space-between" alignItems="center" onClick={() => handleCustomerSupport()}>
                    <FNBox display="flex" alignItems="center" gap={2}>
                        <FNBox>
                            <FNAvatar style={{ padding: pxToRem(2) }} size="sm" src={ChatIcon} />
                        </FNBox>
                        <FNBox>
                            <FNTypography fontSize={16} lineHeight={pxToRem(16)} fontWeight={600} color="black">Need Help?</FNTypography>
                            <FNTypography fontSize={10} color="black" lineHeight={pxToRem(16)} fontWeight={300}>Super fast resolution times</FNTypography>
                        </FNBox>
                    </FNBox>
                    <FNBox>
                        <FNButton
                            id="button-contact-customer-support"
                            variant="outlined"
                            color="black"
                            height={pxToRem(26)}
                            width={pxToRem(100)}
                            radius={14}
                            px={0}
                            py={6}
                        >
                            <FNTypography fontWeight={600} lineHeight={pxToRem(18)} fontSize={10} >Chat with Us</FNTypography>
                        </FNButton>
                    </FNBox>
                </FNBox>
            </Paper>
        </>
    )
}

export default AlgoflowChatBot