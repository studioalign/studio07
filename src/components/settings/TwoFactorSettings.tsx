import React, { useState, useEffect } from 'react';
import { Shield, Key, XCircle, AlertCircle, Loader2, Copy, CheckCircle } from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function TwoFactorSettings() {
  const { user } = useAuth();
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [otpAuthUri, setOtpAuthUri] = useState('');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Check if MFA is enabled on component mount
  useEffect(() => {
    checkMfaStatus();
  }, []);

  // No need for this effect as QRCodeDisplay handles the QR code generation

  const checkMfaStatus = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all factors for the current user
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) throw error;
      
      // Check if there's any verified TOTP factor
      const verifiedTotpFactor = data.totp.find(factor => factor.status === 'verified');
      setIsMfaEnabled(!!verifiedTotpFactor);
      
      // If a factor exists, store its ID
      if (verifiedTotpFactor) {
        setFactorId(verifiedTotpFactor.id);
      }
    } catch (err) {
      console.error('Error checking MFA status:', err);
      setError('Failed to load MFA status');
    } finally {
      setIsLoading(false);
    }
  };

  const startMfaEnrollment = async () => {
    try {
      setIsEnrolling(true);
      setError(null);
      
      // Start the enrollment process
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      });
      
      if (error) throw error;
      
      // Store the factor ID and OTP auth URI
      setFactorId(data.id);
      setOtpAuthUri(data.totp.uri);
    } catch (err) {
      console.error('Error starting MFA enrollment:', err);
      setError(err instanceof Error ? err.message : 'Failed to start MFA enrollment');
    }
  };

  const verifyMfaEnrollment = async () => {
    try {
      setError(null);
      
      if (!verifyCode || verifyCode.length !== 6) {
        setError('Please enter a valid 6-digit code');
        return;
      }
      
      // Verify the TOTP code
      const { data, error } = await supabase.auth.mfa.challenge({
        factorId,
        code: verifyCode
      });
      
      if (error) throw error;
      
      // Verify the challenge
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: data.id,
        code: verifyCode
      });
      
      if (verifyError) throw verifyError;
      
      // Get recovery codes
      const { data: recData, error: recError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (recError) throw recError;
      
      if (recData.currentLevel === 'aal2') {
        // Generate recovery codes - note: this API might change based on Supabase version
        const { data: codes, error: codesError } = await supabase.auth.mfa.generateRecoveryCodes();
        
        if (codesError) throw codesError;
        
        if (codes.codes) {
          setRecoveryCodes(codes.codes);
          setShowRecoveryCodes(true);
        }
        
        // MFA enrollment successful
        setIsMfaEnabled(true);
        setIsEnrolling(false);
        setVerifyCode('');
      }
    } catch (err) {
      console.error('Error verifying MFA enrollment:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify code');
    }
  };

  const disableMfa = async () => {
    try {
      setError(null);
      
      if (!factorId) {
        setError('No MFA factor found to disable');
        return;
      }
      
      // Confirm with the user
      if (!window.confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
        return;
      }
      
      // Unenroll the factor
      const { error } = await supabase.auth.mfa.unenroll({
        factorId
      });
      
      if (error) throw error;
      
      // MFA successfully disabled
      setIsMfaEnabled(false);
      setFactorId('');
      setOtpAuthUri('');
      setQrCode('');
    } catch (err) {
      console.error('Error disabling MFA:', err);
      setError(err instanceof Error ? err.message : 'Failed to disable MFA');
    }
  };

  const cancelMfaEnrollment = () => {
    setIsEnrolling(false);
    setVerifyCode('');
    setOtpAuthUri('');
    setQrCode('');
    setFactorId('');
  };

  // We're now using the QRCodeDisplay component, so this function is removed

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy recovery codes:', err);
        setError('Failed to copy recovery codes');
      });
  };

  const closeRecoveryCodes = () => {
    setShowRecoveryCodes(false);
    setRecoveryCodes([]);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
        <span className="ml-2">Loading MFA settings...</span>
      </div>
    );
  }

  if (showRecoveryCodes) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Shield className="w-5 h-5 text-brand-primary mr-2" />
          <h3 className="text-lg font-medium text-brand-primary">Recovery Codes</h3>
        </div>
        
        <div className="p-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
          <AlertCircle className="w-5 h-5 inline-block mr-2" />
          <span className="font-medium">Important:</span> Save these recovery codes in a secure location. They can be used to regain access to your account if you lose access to your authenticator app.
        </div>
        
        <div className="p-4 bg-gray-50 rounded-md mb-4 font-mono">
          {recoveryCodes.map((code, index) => (
            <div key={index} className="mb-1">{code}</div>
          ))}
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={copyRecoveryCodes}
            className="flex items-center px-4 py-2 border border-brand-primary text-brand-primary rounded-md hover:bg-brand-secondary-100/10"
          >
            {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Copied!' : 'Copy Codes'}
          </button>
          
          <button
            onClick={closeRecoveryCodes}
            className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
          >
            I've Saved My Codes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <Shield className="w-5 h-5 text-brand-primary mr-2" />
        <h3 className="text-lg font-medium text-brand-primary">Two-Factor Authentication (2FA)</h3>
      </div>
      
      {error && (
        <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-start">
          <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      {isMfaEnabled ? (
        <div>
          <div className="p-4 mb-4 bg-green-50 border border-green-200 rounded-md text-green-700 flex items-start">
            <Shield className="w-5 h-5 mr-2 mt-0.5" />
            <div>
              <p className="font-medium">Two-factor authentication is enabled</p>
              <p className="text-sm">Your account is protected with an additional layer of security.</p>
            </div>
          </div>
          
          <button
            onClick={disableMfa}
            className="flex items-center px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-50"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Disable Two-Factor Authentication
          </button>
        </div>
      ) : isEnrolling ? (
        <div className="space-y-4">
          <p className="text-gray-600">
            Scan the QR code with an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator.
          </p>
          
          <div className="flex justify-center my-4">
            {otpAuthUri ? (
              <QRCodeDisplay uri={otpAuthUri} size={200} alt="Two-Factor Authentication QR Code" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded-md">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <label htmlFor="verifyCode" className="block text-sm font-medium text-brand-secondary-400">
              Enter the 6-digit verification code from your authenticator app
            </label>
            <input
              id="verifyCode"
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              placeholder="123456"
              maxLength={6}
              autoComplete="off"
            />
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={verifyMfaEnrollment}
              disabled={verifyCode.length !== 6}
              className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
            >
              Verify and Enable
            </button>
            
            <button
              onClick={cancelMfaEnrollment}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">
            Two-factor authentication adds an extra layer of security to your account by requiring a code from your phone in addition to your password.
          </p>
          
          <button
            onClick={startMfaEnrollment}
            className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
          >
            <Key className="w-4 h-4 mr-2" />
            Enable Two-Factor Authentication
          </button>
        </div>
      )}
    </div>
  );
}
