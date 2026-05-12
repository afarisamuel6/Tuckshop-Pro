/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Box, Card, CardContent, Typography, Button, Avatar, Stack, MenuItem, FormControl, InputLabel, Select, TextField, Alert } from '@mui/material';
import { Store, ArrowForward, Lock } from '@mui/icons-material';
import { storageService } from '../services/storage';
import { Team, CAMPUSES, Campus } from '../types';

interface TeamLoginProps {
  onTeamLogin: (teamName: string, campus: Campus, memberName: string) => void;
  onAdminLogin: () => void;
}

export default function TeamLogin({ onTeamLogin, onAdminLogin }: TeamLoginProps) {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [teamId, setTeamId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [campus, setCampus] = useState<Campus | ''>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTeams(storageService.getTeams());
  }, []);

  const selectedTeam = useMemo(() => teams.find(t => t.id === teamId), [teams, teamId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isAdminMode) {
      if (storageService.validateAdmin(adminUser, adminPass)) {
        onAdminLogin();
      } else {
        setError('Invalid admin credentials.');
      }
      return;
    }

    if (!selectedTeam) return;

    if (selectedTeam.accessCode !== accessCode) {
      setError('Invalid access code for this team.');
      return;
    }

    if (teamId && campus && memberName) {
      onTeamLogin(selectedTeam.name, campus as Campus, memberName);
    }
  };

  return (
    <Box 
      sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0)'
      }}
    >
      <Card 
        className="glass-panel"
        sx={{ 
          maxWidth: 450, 
          width: '100%', 
          borderRadius: 8, 
          p: 2,
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Stack spacing={3} sx={{ alignItems: 'center' }}>
            <Box sx={{ position: 'relative', mb: 1 }}>
              <Avatar 
                sx={{ 
                  bgcolor: 'primary.main', 
                  width: 100, 
                  height: 100, 
                  boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)',
                  border: '4px solid white',
                  '& img': {
                    objectFit: 'contain',
                    p: 1.5
                  }
                }}
                src="/logo.png"
                alt="DTI Logo"
              >
                <Store sx={{ fontSize: 50 }} />
              </Avatar>
              <Box sx={{ 
                position: 'absolute', 
                bottom: 0, 
                right: -5, 
                bgcolor: 'success.main', 
                color: 'white', 
                borderRadius: '12px', 
                px: 1,
                py: 0.2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: '2px solid white'
              }}>
                <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Pro</Typography>
              </Box>
            </Box>
            
            <Box>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 900, 
                  color: 'primary.main',
                  letterSpacing: '-1.5px',
                  mb: 0.5
                }}
              >
                DTI <span style={{ color: '#333' }}>TuckShop</span>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8 }}>
                {isAdminMode ? 'Administrator Login' : 'Team Member Shift Startup'}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} sx={{ p: 0.5, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 10, width: '100%' }}>
              <Button 
                fullWidth 
                variant={!isAdminMode ? 'contained' : 'text'} 
                onClick={() => { setIsAdminMode(false); setError(null); }}
                sx={{ borderRadius: 10, py: 1 }}
              >
                Team Login
              </Button>
              <Button 
                fullWidth 
                variant={isAdminMode ? 'contained' : 'text'} 
                onClick={() => { setIsAdminMode(true); setError(null); }}
                sx={{ borderRadius: 10, py: 1 }}
              >
                Admin
              </Button>
            </Stack>

            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <Stack spacing={2.5}>
                {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
                
                {!isAdminMode ? (
                  <>
                    <FormControl fullWidth>
                      <InputLabel>Select Team</InputLabel>
                      <Select
                        value={teamId}
                        label="Select Team"
                        onChange={(e) => {
                          setTeamId(e.target.value);
                          setMemberName('');
                          setAccessCode('');
                          setError(null);
                        }}
                        required
                        sx={{ borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.5)' }}
                      >
                        {teams.map(t => (
                          <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {selectedTeam && (
                      <FormControl fullWidth>
                        <InputLabel>Select Your Name</InputLabel>
                        <Select
                          value={memberName}
                          label="Select Your Name"
                          onChange={(e) => setMemberName(e.target.value)}
                          required
                          sx={{ borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.5)' }}
                        >
                          {(selectedTeam.members || []).map(member => (
                            <MenuItem key={member} value={member}>{member}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}

                    <FormControl fullWidth>
                      <InputLabel>Select Campus</InputLabel>
                      <Select
                        value={campus}
                        label="Select Campus"
                        onChange={(e) => setCampus(e.target.value as Campus)}
                        required
                        sx={{ borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.5)' }}
                      >
                        {CAMPUSES.map(c => (
                          <MenuItem key={c} value={c}>{c}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      label="Team Access Code"
                      type="password"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      placeholder="Enter 4-digit code"
                      required
                      sx={{ 
                        '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.5)' } 
                      }}
                      slotProps={{ input: { startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} /> } }}
                    />
                  </>
                ) : (
                  <>
                    <TextField
                      fullWidth
                      label="Admin Username"
                      value={adminUser}
                      onChange={(e) => setAdminUser(e.target.value)}
                      required
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.5)' } }}
                    />
                    <TextField
                      fullWidth
                      label="Admin Password"
                      type="password"
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                      required
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.5)' } }}
                    />
                  </>
                )}

                <Button
                  fullWidth
                  size="large"
                  type="submit"
                  variant="contained"
                  endIcon={<ArrowForward />}
                  disabled={isAdminMode ? (!adminUser || !adminPass) : (!teamId || !campus || !memberName || !accessCode)}
                  sx={{ 
                    py: 1.8, 
                    borderRadius: 3, 
                    fontWeight: 800,
                    boxShadow: '0 8px 16px rgba(25, 118, 210, 0.3)',
                    '&:hover': { transform: 'translateY(-2px)' },
                    transition: 'all 0.2s'
                  }}
                >
                  {isAdminMode ? 'Enter Admin Console' : 'Start Shift'}
                </Button>
              </Stack>
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              Shift-based Entrepreneurship Tool
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
