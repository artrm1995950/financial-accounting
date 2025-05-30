const express = require('express');
const cors = require('cors');
const tinkoff = require('tinkoff-invest-api');
const { PortfolioRequest_CurrencyRequest } = require('tinkoff-invest-api/dist/generated/operations.js');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/portfolio', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Токен обязателен" });
  }

  try {
    const api = tinkoff.InvestApi({ token, logLevel: 'error' });

    const { accounts } = await api.users.getAccounts();
    if (!accounts.length) {
      return res.status(404).json({ error: "Нет аккаунтов" });
    }

    const portfolio = await api.operations.getPortfolio({
      accountId: accounts[0].id,
      currency: PortfolioRequest_CurrencyRequest.RUB,
    });

    res.json(portfolio);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('🚀 Сервер работает на http://localhost:3000');
});
