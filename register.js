/* Registration UI. No SMS credentials belong in this file. */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const api = BACKEND_URL;
    const requestedRedirect = new URLSearchParams(location.search).get('redirect') || 'account.html';
    const destination = new URL(requestedRedirect, location.href);
    const redirectTo = destination.origin === location.origin && /^https?:$/.test(destination.protocol)
        ? destination.href : new URL('account.html', location.href).href;
    $('loginLink').href = `login.html?redirect=${encodeURIComponent(redirectTo)}`;
    if (getCustomerToken() && getCustomerData()) location.assign(redirectTo);

    let otpEnabled = false;
    let optionsReady = false;
    let sendingOtp = false;
    let sendingRegistration = false;
    let socialBusy = false;
    let sentPhone = '';
    let resendUntil = 0;
    let resendTimer;
    let otpRequestVersion = 0;

    function normalizePhone(value) {
        let phone = value.trim().replace(/[\s\-()]/g, '');
        if (phone.startsWith('+880')) phone = '0' + phone.slice(4);
        else if (phone.startsWith('880')) phone = '0' + phone.slice(3);
        return phone;
    }
    function message(text, error = false) {
        $('authMsg').textContent = text;
        $('authMsg').dataset.error = String(error);
    }
    async function request(path, body) {
        const response = await fetch(`${api}/api/customer-auth${path}`, {
            method: body === undefined ? 'GET' : 'POST',
            headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(30000), cache: 'no-store'
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(data.error || 'অনুরোধটি সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।');
            error.retryAfter = Number(data.retryAfter) || Number(response.headers.get('Retry-After')) || 0;
            throw error;
        }
        return data;
    }

    function updateSendButton() {
        const remaining = Math.max(0, Math.ceil((resendUntil - Date.now()) / 1000));
        $('sendOtpBtn').disabled = !otpEnabled || sendingOtp || remaining > 0;
        $('sendOtpBtn').textContent = sendingOtp ? 'পাঠানো হচ্ছে…' : remaining ? `${remaining}s` : sentPhone ? 'RESEND' : 'SEND';
        if (!remaining) clearInterval(resendTimer);
    }
    function startCooldown(seconds) {
        resendUntil = Date.now() + seconds * 1000;
        clearInterval(resendTimer);
        updateSendButton();
        resendTimer = setInterval(updateSendButton, 1000);
    }
    async function loadRegistrationOptions() {
        $('registerBtn').disabled = true;
        try {
            const data = await request('/registration-options');
            otpEnabled = data.smsOtpEnabled === true;
            const otpAvailable = data.smsOtpAvailable === true;
            $('regOtp').disabled = !otpEnabled || !otpAvailable;
            $('regOtp').required = otpEnabled;
            $('otpRequiredMark').hidden = !otpEnabled;
            $('otpStatus').textContent = otpEnabled
                ? 'ফোন নম্বর লিখে SEND চাপুন। কোডটি ৫ মিনিট কার্যকর থাকবে।'
                : 'SMS যাচাই এখনো চালু হয়নি। কোড ছাড়াই অ্যাকাউন্ট তৈরি করতে পারবেন।';
            optionsReady = !otpEnabled || otpAvailable;
            $('registerBtn').disabled = !optionsReady;
            updateSendButton();
            if (otpEnabled && !otpAvailable) {
                $('sendOtpBtn').disabled = true;
                $('otpStatus').textContent = 'SMS ভেরিফিকেশন সাময়িকভাবে বন্ধ। পরে আবার চেষ্টা করুন।';
            }
        } catch {
            $('otpStatus').textContent = 'সার্ভারের সংযোগ পাওয়া যাচ্ছে না। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।';
            message('রেজিস্ট্রেশন সেবা এখন পাওয়া যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।', true);
        }
    }
    $('sendOtpBtn').addEventListener('click', async () => {
        if (!otpEnabled || sendingOtp || Date.now() < resendUntil) return;
        const phone = normalizePhone($('regPhone').value);
        if (!/^01[3-9]\d{8}$/.test(phone)) {
            $('otpStatus').textContent = 'সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন।';
            $('regPhone').focus();
            return;
        }
        sendingOtp = true;
        const version = ++otpRequestVersion;
        updateSendButton();
        $('otpStatus').textContent = 'ভেরিফিকেশন কোড পাঠানো হচ্ছে…';
        try {
            const data = await request('/register/otp', { phone });
            if (version !== otpRequestVersion || normalizePhone($('regPhone').value) !== phone) return;
            sentPhone = phone;
            $('regOtp').value = '';
            startCooldown(data.retryAfter || 60);
            $('otpStatus').textContent = 'কোড পাঠানো হয়েছে। SMS-এ পাওয়া ৬ সংখ্যার কোড লিখুন।';
            $('regOtp').focus();
        } catch (error) {
            if (version !== otpRequestVersion) return;
            $('otpStatus').textContent = error.message;
            if (error.retryAfter) startCooldown(error.retryAfter);
        } finally {
            sendingOtp = false;
            updateSendButton();
        }
    });
    $('regPhone').addEventListener('input', () => {
        if (sentPhone && normalizePhone($('regPhone').value) !== sentPhone) {
            sentPhone = '';
            $('regOtp').value = '';
            $('otpStatus').textContent = 'নম্বর পরিবর্তন করেছেন। নতুন নম্বরের জন্য কোড পাঠান।';
        }
        // In-flight replies for an earlier phone must never update this form.
        if (sendingOtp) {
            ++otpRequestVersion;
            $('otpStatus').textContent = 'নম্বর পরিবর্তন করেছেন। নতুন নম্বরের জন্য কোড পাঠান।';
        }
    });
    $('passwordToggle').addEventListener('click', () => {
        const visible = $('regPassword').type === 'password';
        $('regPassword').type = visible ? 'text' : 'password';
        $('passwordToggle').setAttribute('aria-pressed', String(visible));
        $('passwordToggle').setAttribute('aria-label', visible ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখান');
    });

    const now = new Date();
    const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    months.forEach((name, i) => $('birthMonth').add(new Option(name, i + 1)));
    for (let year = now.getFullYear(); year >= now.getFullYear() - 120; year--) $('birthYear').add(new Option(year, year));
    function updateDays() {
        const previous = $('birthDay').value;
        const month = Number($('birthMonth').value);
        const year = Number($('birthYear').value) || 2000;
        const days = month ? new Date(year, month, 0).getDate() : 31;
        $('birthDay').length = 1;
        for (let day = 1; day <= days; day++) $('birthDay').add(new Option(day, day));
        if (Number(previous) <= days) $('birthDay').value = previous;
    }
    $('birthMonth').addEventListener('change', updateDays);
    $('birthYear').addEventListener('change', updateDays);
    updateDays();

    $('registerForm').addEventListener('submit', async event => {
        event.preventDefault();
        if (!optionsReady || sendingRegistration || !$('registerForm').reportValidity()) return;
        const phone = normalizePhone($('regPhone').value);
        if (!/^01[3-9]\d{8}$/.test(phone)) {
            message('সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন।', true);
            $('regPhone').focus();
            return;
        }
        if (otpEnabled && sentPhone !== phone) {
            message('প্রথমে এই ফোন নম্বরে ভেরিফিকেশন কোড পাঠান।', true);
            $('sendOtpBtn').focus();
            return;
        }
        const parts = [$('birthYear').value, $('birthMonth').value, $('birthDay').value];
        let birthday = '';
        if (parts.some(Boolean)) {
            if (!parts.every(Boolean)) { message('জন্মদিনের মাস, দিন ও বছর সবগুলো নির্বাচন করুন।', true); return; }
            birthday = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            if (new Date(`${birthday}T00:00:00`) > now) { message('ভবিষ্যতের জন্মদিন দেওয়া যাবে না।', true); return; }
        }
        sendingRegistration = true;
        $('registerBtn').disabled = true;
        $('registerBtn').textContent = 'তৈরি হচ্ছে…';
        message('');
        try {
            const data = await request('/register', {
                name: $('regName').value.trim(), phone, password: $('regPassword').value,
                email: $('regEmail').value.trim(), otp: otpEnabled ? $('regOtp').value.trim() : undefined,
                birthday, gender: $('regGender').value, marketingSms: $('regMarketingSms').checked
            });
            setCustomerSession(data.token, data.customer);
            location.assign(redirectTo);
        } catch (error) { message(error.message, true); }
        finally {
            sendingRegistration = false;
            $('registerBtn').disabled = false;
            $('registerBtn').textContent = 'SIGN UP';
        }
    });

    async function completeSocialSignup(provider, credentials) {
        if (socialBusy || sendingRegistration) return;
        socialBusy = true;
        $('fbSignUpBtn').disabled = true;
        message('সাইন আপ হচ্ছে…');
        try {
            // Social sign-up uses the existing provider-verified account flow.
            const data = await request(`/${provider}`, credentials);
            setCustomerSession(data.token, data.customer);
            location.assign(redirectTo);
        } catch (error) { message(error.message, true); }
        finally { socialBusy = false; $('fbSignUpBtn').disabled = false; }
    }
    const googleHost = $('googleSignUpBtn');
    let googleInitialized = false;
    let googleWidth = 0;
    function renderGoogle() {
        if (!window.google?.accounts?.id) return;
        const width = Math.floor(googleHost.getBoundingClientRect().width);
        if (width <= 0 || width === googleWidth) return;
        if (!googleInitialized) {
            google.accounts.id.initialize({
                client_id: '558401107682-uh42vi22bqerhsn08j7obr6cq0n480r1.apps.googleusercontent.com',
                callback: response => completeSocialSignup('google', { credential: response.credential }),
                auto_select: false
            });
            googleInitialized = true;
        }
        googleWidth = width;
        googleHost.replaceChildren();
        google.accounts.id.renderButton(googleHost, {
            type: 'standard', theme: 'outline', size: 'large', text: 'signup_with',
            shape: 'rectangular', logo_alignment: 'center', locale: 'en', width
        });
    }
    let googleResizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(googleResizeTimer);
        googleResizeTimer = setTimeout(renderGoogle, 180);
    });
    window.addEventListener('load', () => {
        renderGoogle();
        if (!window.google?.accounts?.id) $('googleStatus').textContent = 'Google লোড হয়নি';
    });
    renderGoogle();

    window.fbAsyncInit = () => window.FB.init({ appId: '1736164367676120', cookie: true, xfbml: false, version: 'v21.0' });
    if (window.FB) window.fbAsyncInit();
    else {
        const sdk = document.createElement('script');
        sdk.src = 'https://connect.facebook.net/en_US/sdk.js';
        sdk.async = true;
        sdk.defer = true;
        sdk.crossOrigin = 'anonymous';
        document.head.appendChild(sdk);
    }
    $('fbSignUpBtn').addEventListener('click', () => {
        if (!window.FB) { message('Facebook এখনো লোড হয়নি। একটু পরে চেষ্টা করুন।', true); return; }
        window.FB.login(response => {
            if (response.authResponse) completeSocialSignup('facebook', { accessToken: response.authResponse.accessToken });
            else message('Facebook সাইন আপ বাতিল করা হয়েছে।', true);
        }, { scope: 'email' });
    });
    loadRegistrationOptions();
})();
