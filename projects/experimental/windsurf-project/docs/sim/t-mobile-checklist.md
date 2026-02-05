# T-MOBILE SIM Purchase Checklist

## 📦 Items to Purchase

- [ ] 3x t-mobile SIM cards (~$10 each)
- [ ] 3x smartphones (if needed)
- [ ] Payment method for monthly plans

## 📋 Activation Steps

1. [ ] Run activation script: `./activate-t-mobile.sh`
2. [ ] Insert SIM cards into devices
3. [ ] Complete online activation for each
4. [ ] Update phone numbers in `sim-config-t-mobile.json`
5. [ ] Test SMS reception
6. [ ] Configure APN settings

## ✅ Validation

- [ ] Run: `bun run validate-sim-config.js`
- [ ] Test: `bun run test-sim-reception.js`
- [ ] Verify: `bun run track-sim-costs.js`

## 📊 Expected Costs

- Setup: $30
- First month: $9
- Monthly thereafter: $9
- Break-even vs temp numbers: 78 accounts
