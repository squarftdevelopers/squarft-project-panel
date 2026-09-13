import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { kycService } from '../../services/kycService';
import { authService } from '../../services/authService';
import { branchService } from '../../services/branchService';

const isApprovedKycStatus = (status) => ['verified', 'approved'].includes(String(status || '').toLowerCase());

export const detectAndAssignBranchThunk = createAsyncThunk(
    'auth/detectAndAssignBranch',
    async ({ latitude, longitude, clientCity, clientState, locationAddress }, { rejectWithValue }) => {
        try {
            const data = await branchService.detectAndAssignBranch({
                latitude,
                longitude,
                clientCity,
                clientState,
            });
            const effectiveLocation = locationAddress || data?.formattedAddress || data?.detectedCity || data?.branch?.city;
            return { ...data, effectiveLocation };
        } catch (error) {
            return rejectWithValue(error.message || 'Unable to detect nearest branch');
        }
    }
);

export const assignBranchThunk = createAsyncThunk(
    'auth/assignBranch',
    async ({ branchId, branchName, location }, { rejectWithValue }) => {
        try {
            const data = await branchService.assignBranch({ branchId, location });
            if (data?.branch) {
                await authService.updateUserData({
                    branch_id: data.branch.id,
                    branch_name: data.branch.name || branchName,
                    ...(location ? { location } : {}),
                });
            }
            return { ...data, branchName: branchName || data.branch?.name, location };
        } catch (error) {
            return rejectWithValue(error.message || 'Unable to assign branch');
        }
    }
);

export const hydrateAuthThunk = createAsyncThunk('auth/hydrate', async () => ({
    token: await authService.getToken(),
    user: await authService.getUserData(),
}));

export const sendOtpThunk = createAsyncThunk(
    'auth/sendOtp',
    async ({ phone, purpose }, { rejectWithValue }) => {
        try {
            return await authService.sendOtp(phone, purpose);
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to send OTP');
        }
    }
);

export const verifyOtpThunk = createAsyncThunk(
    'auth/verifyOtp',
    async ({ otp_token, otp }, { rejectWithValue }) => {
        try {
            return await authService.verifyOtp(otp_token, otp);
        } catch (error) {
            return rejectWithValue(error.message || 'OTP verification failed');
        }
    }
);

export const registerThunk = createAsyncThunk(
    'auth/register',
    async (payload, { rejectWithValue }) => {
        try {
            return await authService.register(payload);
        } catch (error) {
            return rejectWithValue(error.message || 'Registration failed');
        }
    }
);

export const loginThunk = createAsyncThunk(
    'auth/login',
    async (verifiedToken, { rejectWithValue }) => {
        try {
            return await authService.login(verifiedToken);
        } catch (error) {
            return rejectWithValue(error.message || 'Login failed');
        }
    }
);

export const fetchDeveloperKyc = createAsyncThunk(
    'auth/fetchDeveloperKyc',
    async (_, { rejectWithValue }) => {
        try {
            console.log('[KYC THUNK] fetchDeveloperKyc started');
            return await kycService.getMyKyc();
        } catch (error) {
            const diagnostic = {
                message: error.message || 'Unable to fetch KYC status',
                status: error.status,
                data: error.data,
            };
            console.error('[KYC THUNK] fetchDeveloperKyc rejected:', diagnostic);
            return rejectWithValue(diagnostic);
        }
    }
);

export const uploadDeveloperKyc = createAsyncThunk(
    'auth/uploadDeveloperKyc',
    async (payload, { getState, rejectWithValue }) => {
        try {
            const hasExistingKyc = !!getState().auth.kyc;
            return await kycService.uploadKyc(payload, hasExistingKyc);
        } catch (error) {
            return rejectWithValue(error.message || 'Unable to upload KYC documents');
        }
    }
);

export const submitDeveloperKyc = createAsyncThunk(
    'auth/submitDeveloperKyc',
    async (_, { rejectWithValue }) => {
        try {
            return await kycService.submitKyc();
        } catch (error) {
            return rejectWithValue(error.message || 'Unable to submit KYC');
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        firstName: '',
        lastName: '',
        mobile: '',
        newPassword: '',
        confirmPassword: '',
        companyName: '',
        companyType: '',
        reraNumber: '',
        location: '',
        branchId: '',
        branchName: '',
        otp: ['', '', '', '', '', ''],
        otpFlow: 'register',
        otpToken: null,
        verifiedToken: null,
        rememberMe: false,
        isLoggedIn: false,
        authChecked: false,
        isKycCompleted: false,
        kycInitialized: false,
        kyc: null,
        kycStatus: null,
        kycLoading: false,
        kycError: null,
        user: null,
        token: null,
        loading: false,
        error: null,
    },
    reducers: {
        setFirstName: (state, action) => { state.firstName = action.payload; },
        setLastName: (state, action) => { state.lastName = action.payload; },
        setMobile: (state, action) => { state.mobile = action.payload; },
        setNewPassword: (state, action) => { state.newPassword = action.payload; },
        setConfirmPassword: (state, action) => { state.confirmPassword = action.payload; },
        setCompanyName: (state, action) => { state.companyName = action.payload; },
        setCompanyType: (state, action) => { state.companyType = action.payload; },
        setReraNumber: (state, action) => { state.reraNumber = action.payload; },
        setLocation: (state, action) => { state.location = action.payload; },
        setBranch: (state, action) => {
            state.branchId = action.payload.id;
            state.branchName = action.payload.name;
            if (state.user) {
                state.user.branch_id = action.payload.id;
            }
        },
        setOtpDigit: (state, action) => {
            const { index, value } = action.payload;
            state.otp[index] = value;
        },
        clearOtp: (state) => { state.otp = ['', '', '', '', '', '']; },
        setOtpFlow: (state, action) => { state.otpFlow = action.payload; },
        clearAuthInputs: (state) => {
            state.newPassword = '';
            state.confirmPassword = '';
            state.otp = ['', '', '', '', '', ''];
            state.otpToken = null;
            state.verifiedToken = null;
            state.error = null;
        },
        toggleRememberMe: (state) => { state.rememberMe = !state.rememberMe; },
        setLoggedIn: (state, action) => { state.isLoggedIn = action.payload; },
        setKycCompleted: (state, action) => {
            state.isKycCompleted = action.payload;
            state.kycInitialized = true;
        },
        setKycStatus: (state, action) => {
            state.kycStatus = action.payload;
            state.isKycCompleted = isApprovedKycStatus(action.payload);
            state.kycInitialized = true;
        },
        setUser: (state, action) => { state.user = action.payload; },
        setToken: (state, action) => { state.token = action.payload; },
        setLoading: (state, action) => { state.loading = action.payload; },
        setError: (state, action) => { state.error = action.payload; },
        clearError: (state) => { state.error = null; },
        logout: (state) => {
            state.firstName = '';
            state.lastName = '';
            state.mobile = '';
            state.companyName = '';
            state.companyType = '';
            state.reraNumber = '';
            state.location = '';
            state.branchId = '';
            state.branchName = '';
            state.otpToken = null;
            state.verifiedToken = null;
            state.isLoggedIn = false;
            state.isKycCompleted = false;
            state.kycInitialized = false;
            state.kyc = null;
            state.kycStatus = null;
            state.kycError = null;
            state.user = null;
            state.token = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(hydrateAuthThunk.fulfilled, (state, action) => {
                state.authChecked = true;
                if (action.payload.token) {
                    state.token = action.payload.token;
                    state.user = action.payload.user;
                    state.location = action.payload.user?.location || state.location;
                    state.branchId = action.payload.user?.branch_id || state.branchId;
                    state.branchName = action.payload.user?.branch_name || state.branchName;
                    state.isLoggedIn = true;
                }
            })
            .addCase(hydrateAuthThunk.rejected, (state) => {
                state.authChecked = true;
            })
            .addCase(sendOtpThunk.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(sendOtpThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.otpToken = action.payload.otp_token;
            })
            .addCase(sendOtpThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(verifyOtpThunk.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(verifyOtpThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.verifiedToken = action.payload.verified_token;
            })
            .addCase(verifyOtpThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(registerThunk.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(registerThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.token = action.payload.token;
                state.user = action.payload.user || state.user;
                state.branchId = action.payload.user?.branch_id || '';
                state.branchName = action.payload.user?.branch_name || '';
                state.isLoggedIn = true;
                // A brand-new account can never already have KYC completed -
                // force these back to their true defaults rather than leaving
                // whatever isKycCompleted happened to hold. Without this, a
                // developer who logged into an already-approved account and
                // then registered a second, fresh account in the same app
                // session (no logout in between) would carry the first
                // account's "completed" flag onto the new one and skip
                // straight to home instead of the KYC screen.
                state.kyc = null;
                state.kycStatus = null;
                state.isKycCompleted = false;
                state.kycInitialized = true;
            })
            .addCase(registerThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(loginThunk.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(loginThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.token = action.payload.token;
                state.user = action.payload.user || state.user;
                state.location = action.payload.user?.location || state.location;
                state.branchId = action.payload.user?.branch_id || state.branchId;
                state.branchName = action.payload.user?.branch_name || state.branchName;
                state.isLoggedIn = true;
                state.kycInitialized = false;
            })
            .addCase(loginThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(detectAndAssignBranchThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(detectAndAssignBranchThunk.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload?.effectiveLocation) {
                    state.location = action.payload.effectiveLocation;
                }
            })
            .addCase(detectAndAssignBranchThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(assignBranchThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(assignBranchThunk.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload?.branch) {
                    state.branchId = action.payload.branch.id;
                    state.branchName = action.payload.branch.name || action.payload.branchName;
                    if (action.payload.location) {
                        state.location = action.payload.location;
                    }
                    if (state.user) {
                        state.user.branch_id = action.payload.branch.id;
                        if (action.payload.location) {
                            state.user.location = action.payload.location;
                        }
                    }
                }
            })
            .addCase(assignBranchThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchDeveloperKyc.pending, (state) => {
                console.log('[KYC REDUX] Request pending');
                state.kycLoading = true;
                state.kycError = null;
            })
            .addCase(fetchDeveloperKyc.fulfilled, (state, action) => {
                const status = action.payload?.verification_status || null;
                console.log('[KYC REDUX] Request fulfilled:', { hasKyc: !!action.payload, status });
                state.kycLoading = false;
                state.kyc = action.payload;
                state.kycStatus = status;
                state.isKycCompleted = isApprovedKycStatus(status);
                state.kycInitialized = true;
            })
            .addCase(fetchDeveloperKyc.rejected, (state, action) => {
                console.error('[KYC REDUX] Request rejected:', action.payload || action.error);
                state.kycLoading = false;
                state.kycError = action.payload?.message || action.error?.message;
                state.isKycCompleted = false;
                state.kycInitialized = true;
            })
            .addCase(uploadDeveloperKyc.pending, (state) => {
                state.kycLoading = true;
                state.kycError = null;
            })
            .addCase(uploadDeveloperKyc.fulfilled, (state, action) => {
                const status = action.payload?.verification_status || 'pending';
                state.kycLoading = false;
                state.kyc = action.payload;
                state.kycStatus = status;
                state.isKycCompleted = isApprovedKycStatus(status);
                state.kycInitialized = true;
            })
            .addCase(uploadDeveloperKyc.rejected, (state, action) => {
                state.kycLoading = false;
                state.kycError = action.payload;
            })
            .addCase(submitDeveloperKyc.pending, (state) => {
                state.kycLoading = true;
                state.kycError = null;
            })
            .addCase(submitDeveloperKyc.fulfilled, (state, action) => {
                const status = action.payload?.verification_status || 'under_review';
                state.kycLoading = false;
                state.kyc = action.payload;
                state.kycStatus = status;
                state.isKycCompleted = isApprovedKycStatus(status);
                state.kycInitialized = true;
            })
            .addCase(submitDeveloperKyc.rejected, (state, action) => {
                state.kycLoading = false;
                state.kycError = action.payload;
            });
    },
});

export const {
    setFirstName,
    setLastName,
    setMobile,
    setNewPassword,
    setConfirmPassword,
    setCompanyName,
    setCompanyType,
    setReraNumber,
    setLocation,
    setBranch,
    setOtpDigit,
    clearOtp,
    setOtpFlow,
    clearAuthInputs,
    toggleRememberMe,
    setLoggedIn,
    setKycCompleted,
    setKycStatus,
    setUser,
    setToken,
    setLoading,
    setError,
    clearError,
    logout
} = authSlice.actions;
export default authSlice.reducer;
