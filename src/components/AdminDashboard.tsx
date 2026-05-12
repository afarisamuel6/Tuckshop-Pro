/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, TextField, Stack, Card, CardContent, 
  IconButton, List, ListItem, ListItemText, Divider, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableHead, TableRow
} from '@mui/material';
import { Add, Delete, GroupAdd, Business, History, Edit } from '@mui/icons-material';
import { storageService } from '../services/storage';
import { Team, CAMPUSES, Sale, LoginLog } from '../types';

export default function AdminDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamToDeleteId, setTeamToDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    members: '',
    accessCode: ''
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setTeams(storageService.getTeams());
    setSales(storageService.getSales());
    setLogs(storageService.getLogs());
  };

  const getCampusStats = (campusName: string) => {
    const campusSales = sales.filter(s => s.campus === campusName);
    const revenue = campusSales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const profit = campusSales.reduce((sum, s) => sum + s.totalProfit, 0);
    return { revenue, profit, count: campusSales.length };
  };

  const handleOpen = (team?: Team) => {
    if (team) {
      setEditingTeamId(team.id);
      setFormData({
        name: team.name,
        members: (team.members || []).join(', '),
        accessCode: team.accessCode
      });
    } else {
      setEditingTeamId(null);
      setFormData({ name: '', members: '', accessCode: '' });
    }
    setOpen(true);
  };

  const handleSaveTeam = () => {
    if (!formData.name.trim() || !formData.accessCode.trim()) return;
    
    const membersList = formData.members
      .split(',')
      .map(m => m.trim())
      .filter(m => m !== '');

    if (editingTeamId) {
      storageService.updateTeam(editingTeamId, {
        name: formData.name.trim(),
        members: membersList,
        accessCode: formData.accessCode.trim()
      });
    } else {
      const newTeam: Team = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name.trim(),
        members: membersList,
        accessCode: formData.accessCode.trim()
      };
      const updated = [...teams, newTeam];
      storageService.saveTeams(updated);
    }
    
    refreshData();
    setOpen(false);
    setEditingTeamId(null);
  };

  const confirmDeleteTeam = (id: string) => {
    setTeamToDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteTeam = () => {
    if (teamToDeleteId) {
      storageService.deleteTeam(teamToDeleteId);
      refreshData();
      setDeleteDialogOpen(false);
      setTeamToDeleteId(null);
    }
  };

  return (
    <Box sx={{ p: 4, height: '100%', overflow: 'auto' }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>Administrator Control</Typography>
          <Typography variant="body1" color="text.secondary">Onboard teams, monitor campus performance, and manage infrastructure.</Typography>
        </Box>

        {/* Campus Summary Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
          {CAMPUSES.map(campus => {
            const stats = getCampusStats(campus);
            return (
              <Card key={campus} sx={{ bgcolor: 'rgba(25, 118, 210, 0.03)' }}>
                <CardContent>
                  <Typography variant="overline" color="primary" sx={{ fontWeight: 'bold' }}>{campus}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, mt: 1 }}>GH₵{stats.revenue.toFixed(2)}</Typography>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">Profit: GH₵{stats.profit.toFixed(2)}</Typography>
                    <Typography variant="caption" color="text.secondary">{stats.count} Sales</Typography>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
          {/* Team Management */}
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <GroupAdd color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Team Onboarding</Typography>
                </Stack>
                <Button variant="contained" size="small" onClick={() => handleOpen()} startIcon={<Add />}>
                  Onboard Team
                </Button>
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {teams.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No teams onboarded yet.
                  </Typography>
                ) : (
                  teams.map(team => (
                    <Box key={team.id}>
                      <ListItem 
                        secondaryAction={
                          <Stack direction="row" spacing={1}>
                            <IconButton edge="end" color="primary" onClick={() => handleOpen(team)}>
                              <Edit />
                            </IconButton>
                            <IconButton edge="end" color="error" onClick={() => confirmDeleteTeam(team.id)}>
                              <Delete />
                            </IconButton>
                          </Stack>
                        }
                      >
                        <ListItemText 
                          primary={<Typography sx={{ fontWeight: 'bold' }}>{team.name}</Typography>} 
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="caption" sx={{ display: 'block' }}>Code: {team.accessCode}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Members: {(team.members || []).join(', ')}
                              </Typography>
                            </Box>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </Box>
                  ))
                )}
              </List>
            </CardContent>
          </Card>

          {/* Dialog for Onboarding / Edit */}
          <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold' }}>{editingTeamId ? 'Edit Team' : 'Onboard New Team'}</DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 1 }}>
                <TextField 
                  fullWidth 
                  label="Team Name" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Team Alpha"
                />
                <TextField 
                  fullWidth 
                  label="Access Code" 
                  value={formData.accessCode}
                  onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                  placeholder="e.g. 1234"
                  helperText="Required for team login"
                />
                <TextField 
                  fullWidth 
                  label="Team Members" 
                  multiline
                  rows={3}
                  value={formData.members}
                  onChange={(e) => setFormData({ ...formData, members: e.target.value })}
                  placeholder="Comma separated names: Alice, Bob, Charlie..."
                  helperText="Enter names separated by commas"
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button 
                variant="contained" 
                onClick={handleSaveTeam}
                disabled={!formData.name || !formData.accessCode}
              >
                {editingTeamId ? 'Update Team' : 'Onboard'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Team Delete Confirmation */}
          <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold' }}>Delete Team</DialogTitle>
            <DialogContent>
              <Typography>Are you certain you want to remove this team? This will disable their login access immediately.</Typography>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="contained" color="error" onClick={handleDeleteTeam}>Remove Team</Button>
            </DialogActions>
          </Dialog>

          {/* Campus Management */}
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
                <Business color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Campus Locations</Typography>
              </Stack>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Pre-configured campus locations for this deployment:
              </Typography>

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {CAMPUSES.map(campus => (
                  <Chip 
                    key={campus} 
                    label={campus} 
                    color="primary" 
                    variant="outlined" 
                    sx={{ fontWeight: 'bold', borderRadius: 2 }} 
                  />
                ))}
              </Stack>

              <Box sx={{ mt: 4, p: 2, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                  System Note
                </Typography>
                <Typography variant="body2">
                  Campus names are strictly enforced to ensure consistent data across analytics reporting.
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Login Logs */}
          <Card sx={{ gridColumn: { md: 'span 2' } }}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
                <History color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>System Access Logs</Typography>
              </Stack>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Team</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Campus</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{new Date(log.timestamp).toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{log.user}</TableCell>
                        <TableCell>
                          <Chip 
                            label={log.role === 'admin' ? 'Admin' : 'Team'} 
                            size="small" 
                            color={log.role === 'admin' ? 'primary' : 'default'} 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell color="text.secondary">{log.teamName || '-'}</TableCell>
                        <TableCell color="text.secondary">{log.campus || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3 }}>No access logs recorded yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
}
