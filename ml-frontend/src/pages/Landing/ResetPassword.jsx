// src/pages/Landing/ResetPassword.js
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { ResetPasswordForm } from 'features';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'background.default' }}>
            <ResetPasswordForm token={token} />
        </Box>
    );
};

export default ResetPassword;