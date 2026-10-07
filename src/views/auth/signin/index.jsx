import { ArrowRightOutlined, LoadingOutlined } from '@ant-design/icons';
import { SocialLogin } from '@/components/common';
import { CustomInput } from '@/components/formik';
import { FORGOT_PASSWORD, SIGNUP } from '@/constants/routes';
import { Field, Form, Formik } from 'formik';
import { useDocumentTitle, useScrollTop } from '@/hooks';
import PropType from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { signIn } from '@/redux/actions/authActions';
import { setAuthenticating, setAuthStatus } from '@/redux/actions/miscActions';
import PhoneInputExport from 'react-phone-input-2';
import firebase from '@/services/firebase';
import * as Yup from 'yup';

const PhoneInput = PhoneInputExport.default || PhoneInputExport;

const SignInSchema = Yup.object().shape({
  email: Yup.string()
    .email('Email is not valid.')
    .required('Email is required.'),
  password: Yup.string()
    .required('Password is required.')
});

const SignIn = ({ history }) => {
  const { authStatus, isAuthenticating } = useSelector((state) => ({
    authStatus: state.app.authStatus,
    isAuthenticating: state.app.isAuthenticating
  }));

  const dispatch = useDispatch();
  const [isPhoneAuth, setIsPhoneAuth] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const recaptchaVerifier = useRef(null);

  useScrollTop();
  useDocumentTitle('Sign In | Salinaka');

  useEffect(() => () => {
    dispatch(setAuthStatus(null));
    dispatch(setAuthenticating(false));
  }, []);

  useEffect(() => {
    if (!isPhoneAuth) return undefined;

    recaptchaVerifier.current = firebase.createPhoneRecaptchaVerifier('phone-auth-recaptcha');
    return () => {
      if (recaptchaVerifier.current) {
        recaptchaVerifier.current.clear();
        recaptchaVerifier.current = null;
      }
    };
  }, [isPhoneAuth]);

  const onSignUp = () => history.push(SIGNUP);

  const onSubmitForm = (form) => {
    dispatch(signIn(form.email, form.password));
  };

  const setPhoneAuthError = (error) => {
    let message = 'Phone verification failed. Please try again.';

    if (error.code === 'auth/invalid-phone-number') {
      message = 'Enter a valid phone number, including its country code.';
    } else if (error.code === 'auth/invalid-verification-code') {
      message = 'That verification code is incorrect. Please try again.';
    } else if (error.code === 'auth/code-expired' || error.code === 'auth/invalid-verification-id') {
      message = 'This verification code has expired. Request a new code.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Too many attempts. Please wait before trying again.';
    } else if (error.code === 'auth/network-request-failed') {
      message = 'Network error. Check your connection and try again.';
    }

    dispatch(setAuthStatus({ success: false, type: 'auth', isError: true, message }));
  };

  const onSendVerificationCode = async (event) => {
    event.preventDefault();
    if (isSendingCode || isVerifyingCode || isAuthenticating) return;

    setIsSendingCode(true);
    dispatch(setAuthStatus(null));
    try {
      const result = await firebase.signInWithPhoneNumber(`+${phoneNumber}`, recaptchaVerifier.current);
      setConfirmationResult(result);
      setVerificationCode('');
    } catch (error) {
      setPhoneAuthError(error);
    } finally {
      setIsSendingCode(false);
    }
  };

  const onVerifyCode = async (event) => {
    event.preventDefault();
    if (!confirmationResult || isSendingCode || isVerifyingCode || isAuthenticating) return;

    setIsVerifyingCode(true);
    dispatch(setAuthenticating(true));
    dispatch(setAuthStatus(null));
    try {
      await confirmationResult.confirm(verificationCode);
    } catch (error) {
      dispatch(setAuthenticating(false));
      setPhoneAuthError(error);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const onChangeAuthMethod = () => {
    setIsPhoneAuth(!isPhoneAuth);
    setConfirmationResult(null);
    setVerificationCode('');
    dispatch(setAuthStatus(null));
  };

  const onBackToPhoneNumber = () => {
    setConfirmationResult(null);
    setVerificationCode('');
    dispatch(setAuthStatus(null));
  };

  const onClickLink = (e) => {
    if (isAuthenticating) e.preventDefault();
  };

  return (
    <div className="auth-content">
      {authStatus?.success && (
        <div className="loader">
          <h3 className="toast-success auth-success">
            {authStatus.message}
            <LoadingOutlined />
          </h3>
        </div>
      )}
      {!authStatus?.success && (
        <>
          {authStatus?.message && (
            <h5 className="text-center toast-error">
              {authStatus?.message}
            </h5>
          )}
          <div className={`auth ${authStatus?.message && (!authStatus?.success && 'input-error')}`}>
            <div className="auth-main">
              <h3>Sign in to Salinaka</h3>
              <br />
              <div className="auth-wrapper">
                {!isPhoneAuth ? (
                  <>
                    <Formik
                      initialValues={{
                        email: '',
                        password: ''
                      }}
                      validateOnChange
                      validationSchema={SignInSchema}
                      onSubmit={onSubmitForm}
                    >
                      {() => (
                        <Form>
                          <div className="auth-field">
                            <Field
                              disabled={isAuthenticating}
                              name="email"
                              type="email"
                              label="Email"
                              placeholder="test@example.com"
                              component={CustomInput}
                            />
                          </div>
                          <div className="auth-field">
                            <Field
                              disabled={isAuthenticating}
                              name="password"
                              type="password"
                              label="Password"
                              placeholder="Your Password"
                              component={CustomInput}
                            />
                          </div>
                          <br />
                          <div className="auth-field auth-action">
                            <Link
                              onClick={onClickLink}
                              style={{ textDecoration: 'underline' }}
                              to={FORGOT_PASSWORD}
                            >
                              <span>Forgot password?</span>
                            </Link>
                            <button
                              className="button auth-button"
                              disabled={isAuthenticating}
                              type="submit"
                            >
                              {isAuthenticating ? 'Signing In' : 'Sign In'}
                              &nbsp;
                              {isAuthenticating ? <LoadingOutlined /> : <ArrowRightOutlined />}
                            </button>
                          </div>
                        </Form>
                      )}
                    </Formik>
                    <button
                      className="button button-border auth-button"
                      disabled={isAuthenticating}
                      onClick={onChangeAuthMethod}
                      type="button"
                    >
                      Continue with Phone
                    </button>
                  </>
                ) : (
                  <div className="auth-field">
                    <h4>{confirmationResult ? 'Enter the verification code' : 'Sign in with your phone'}</h4>
                    {confirmationResult ? (
                      <form onSubmit={onVerifyCode}>
                        <div className="auth-field">
                          <label className="label-input" htmlFor="verification-code">Verification code</label>
                          <input
                            autoComplete="one-time-code"
                            className="input-form"
                            id="verification-code"
                            inputMode="numeric"
                            maxLength="6"
                            onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))}
                            required
                            value={verificationCode}
                          />
                        </div>
                        <br />
                        <div className="auth-field auth-action">
                          <button
                            className="button button-border"
                            disabled={isVerifyingCode || isAuthenticating}
                            onClick={onBackToPhoneNumber}
                            type="button"
                          >
                            Change number
                          </button>
                          <button
                            className="button auth-button"
                            disabled={!verificationCode || isVerifyingCode || isAuthenticating}
                            type="submit"
                          >
                            {isVerifyingCode ? 'Verifying' : 'Verify code'}
                            &nbsp;
                            {isVerifyingCode ? <LoadingOutlined /> : <ArrowRightOutlined />}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={onSendVerificationCode}>
                        <div className="auth-field">
                          <label className="label-input" htmlFor="phone-number">Phone number</label>
                          <PhoneInput
                            country="in"
                            disabled={isSendingCode || isAuthenticating}
                            enableSearch
                            inputClass="input-form d-block"
                            inputProps={{ id: 'phone-number', name: 'phoneNumber', required: true }}
                            onChange={setPhoneNumber}
                            placeholder="Phone number"
                            value={phoneNumber}
                          />
                        </div>
                        <div id="phone-auth-recaptcha" />
                        <br />
                        <div className="auth-field auth-action">
                          <button
                            className="button button-border"
                            disabled={isSendingCode || isAuthenticating}
                            onClick={onChangeAuthMethod}
                            type="button"
                          >
                            Back to email
                          </button>
                          <button
                            className="button auth-button"
                            disabled={!phoneNumber || isSendingCode || isAuthenticating}
                            type="submit"
                          >
                            {isSendingCode ? 'Sending code' : 'Send verification code'}
                            &nbsp;
                            {isSendingCode ? <LoadingOutlined /> : <ArrowRightOutlined />}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="auth-divider">
              <h6>OR</h6>
            </div>
            <SocialLogin isLoading={isAuthenticating} />
          </div>
          <div className="auth-message">
            <span className="auth-info">
              <strong>Don&apos;t have an account?</strong>
            </span>
            <button
              className="button button-small button-border button-border-gray button-icon"
              disabled={isAuthenticating}
              onClick={onSignUp}
              type="button"
            >
              Sign Up
            </button>
          </div>
        </>
      )}
    </div>
  );
};

SignIn.propTypes = {
  history: PropType.shape({
    push: PropType.func
  }).isRequired
};

export default SignIn;
