/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { Box, Typography, Card, CardContent, Stack, Divider, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { TrendingUp, AccountBalanceWallet, LocalMall, Groups, FilterList } from '@mui/icons-material';
import { Sale, CAMPUSES } from '../types';

interface AnalyticsProps {
  sales: Sale[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Analytics({ sales }: AnalyticsProps) {
  const [campusFilter, setCampusFilter] = useState<string>('All');

  const filteredSales = useMemo(() => {
    if (campusFilter === 'All') return sales;
    return sales.filter(s => s.campus === campusFilter);
  }, [sales, campusFilter]);

  const stats = useMemo(() => {
    const revenue = filteredSales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const profit = filteredSales.reduce((sum, s) => sum + s.totalProfit, 0);
    const count = filteredSales.length;
    
    // Revenue by Team
    const teamRevenue: { [key: string]: number } = {};
    filteredSales.forEach(s => {
      teamRevenue[s.teamName] = (teamRevenue[s.teamName] || 0) + s.totalRevenue;
    });
    const teamData = Object.entries(teamRevenue)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Revenue by Category
    const catRevenue: { [key: string]: number } = {};
    filteredSales.forEach(s => {
      s.items.forEach(item => {
        catRevenue[item.category] = (catRevenue[item.category] || 0) + (item.sellingPrice * item.quantity);
      });
    });
    const catData = Object.entries(catRevenue).map(([name, value]) => ({ name, value }));

    // Sales over time (last 7 entries for simplicity)
    const timelineData = filteredSales.slice(-7).map((s, i) => ({
      name: `Sale ${i + 1}`,
      rev: s.totalRevenue,
      prof: s.totalProfit
    }));

    return { revenue, profit, count, teamData, catData, timelineData };
  }, [filteredSales]);

  const topProducts = useMemo(() => {
    const productSales: { [key: string]: { name: string, qty: number, rev: number } } = {};
    filteredSales.forEach(s => {
      s.items.forEach(item => {
        if (!productSales[item.id]) {
          productSales[item.id] = { name: item.name, qty: 0, rev: 0 };
        }
        productSales[item.id].qty += item.quantity;
        productSales[item.id].rev += item.sellingPrice * item.quantity;
      });
    });
    return Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [filteredSales]);

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 40px)', overflow: 'auto' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>Analytics Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">Comprehensive performance tracking across campuses.</Typography>
        </Box>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="campus-filter-label"><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><FilterList fontSize="small" /><span>Filter by Campus</span></Stack></InputLabel>
          <Select
            labelId="campus-filter-label"
            value={campusFilter}
            label="Filter by Campus"
            onChange={(e) => setCampusFilter(e.target.value)}
            sx={{ borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.5)' }}
          >
            <MenuItem value="All">All Campuses</MenuItem>
            {CAMPUSES.map(c => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, 
        gap: 3, 
        mb: 4 
      }}>
        <Card sx={{ bgcolor: 'rgba(25, 118, 210, 0.1)', color: 'primary.main', border: '1px solid rgba(25, 118, 210, 0.2)' }}>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <TrendingUp fontSize="large" sx={{ opacity: 0.8 }} />
              <Box>
                <Typography variant="overline" sx={{ fontWeight: 'bold' }}>Total Revenue</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>GH₵{stats.revenue.toFixed(2)}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
        
        <Card sx={{ bgcolor: 'rgba(46, 125, 50, 0.1)', color: 'success.main', border: '1px solid rgba(46, 125, 50, 0.2)' }}>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <AccountBalanceWallet fontSize="large" sx={{ opacity: 0.8 }} />
              <Box>
                <Typography variant="overline" sx={{ fontWeight: 'bold' }}>Total Profit</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>GH₵{stats.profit.toFixed(2)}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: 'rgba(156, 39, 176, 0.1)', color: 'secondary.main', border: '1px solid rgba(156, 39, 176, 0.2)' }}>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <LocalMall fontSize="large" sx={{ opacity: 0.8 }} />
              <Box>
                <Typography variant="overline" sx={{ fontWeight: 'bold' }}>Total Sales</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{stats.count}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: 'rgba(237, 108, 2, 0.1)', color: 'warning.main', border: '1px solid rgba(237, 108, 2, 0.2)' }}>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Groups fontSize="large" sx={{ opacity: 0.8 }} />
              <Box>
                <Typography variant="overline" sx={{ fontWeight: 'bold' }}>Avg Transaction</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  GH₵{stats.count > 0 ? (stats.revenue / stats.count).toFixed(2) : '0.00'}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', lg: '8fr 4fr' }, 
        gap: 3,
        mb: 3
      }}>
        {/* Revenue Timeline */}
        <Card sx={{ height: 400 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }} gutterBottom>Recent Performance</Typography>
            <Box sx={{ height: 300, width: '100%' }}>
              <ResponsiveContainer>
                <LineChart data={stats.timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="rev" stroke="#1976d2" name="Revenue" strokeWidth={3} />
                  <Line type="monotone" dataKey="prof" stroke="#2e7d32" name="Profit" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card sx={{ height: 400 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }} gutterBottom>Category Share</Typography>
            <Box sx={{ height: 300, width: '100%' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={stats.catData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.catData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
        gap: 3 
      }}>
        {/* Team Performance */}
        <Card sx={{ height: 350 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }} gutterBottom>Revenue by Team</Typography>
            <Box sx={{ height: 250, width: '100%' }}>
              <ResponsiveContainer>
                <ReBarChart data={stats.teamData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1976d2" radius={[4, 4, 0, 0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card sx={{ height: 350 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }} gutterBottom>Top Selling Products</Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {topProducts.map((p, i) => (
                <Box key={p.name}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{i + 1}. {p.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{p.qty} units</Typography>
                  </Stack>
                  <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold' }}>GH₵{p.rev.toFixed(2)} total revenue</Typography>
                  {i < topProducts.length - 1 && <Divider sx={{ mt: 1 }} />}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
