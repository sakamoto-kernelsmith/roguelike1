# Rogue Depths Balance Report

## Summary

- Early game reward pacing: `strong` (score 8/8)
- Late game pressure: `too_easy`
- Expected level at Floor 10: `Lv8`

## Early Game

- First level-up reaches by: Floor 1
- First Lv3 reaches by: Floor 3
- First special weapon floor: 4
- First special armor floor: 4
- Early safety ratios: F1 16.67, F2 20.63, F3 27.00

Interpretation: the player should see a reward quickly. The current build already levels up on Floor 1, but the first truly distinctive build reward should be deliberately surfaced, not left entirely to random drops.

## Level Pace

- Floor 1: exp +13.3 | total 13.3 | approx Lv 2
- Floor 2: exp +21.0 | total 34.3 | approx Lv 2
- Floor 3: exp +26.4 | total 60.7 | approx Lv 3
- Floor 4: exp +50.2 | total 110.9 | approx Lv 4
- Floor 5: exp +130.2 | total 241.1 | approx Lv 5
- Floor 6: exp +82.9 | total 323.9 | approx Lv 6
- Floor 7: exp +96.5 | total 420.5 | approx Lv 6
- Floor 8: exp +100.6 | total 521.1 | approx Lv 7
- Floor 9: exp +175.5 | total 696.6 | approx Lv 7
- Floor 10: exp +358.3 | total 1054.9 | approx Lv 8

## Late Game

- Floor 8: average safety ratio 48.36
- Floor 9: average safety ratio 53.29
- Floor 10: average safety ratio 51.50

Interpretation: late floors can be stricter than early floors. Current coarse estimates suggest the late game may be too forgiving for a well-equipped run, so difficulty budget can be shifted later without harming first-run onboarding.

## Recommendations For Implementation

- �ŏ��̃��x���A�b�v�� Floor 1 �ŋN���Ă���ǍD�B�ێ����Ă悢�B
- ������ʕt������̏��o�� Floor 4�B����̋����Ƃ��Ă͏�������B
- Floor 8?10 �͒ʏ�G�̈����ア�B�I�ՓG��HP/�h��������グ�邩�A�I�Ց����̐L�т�}����B�㔼�͌����߂ł悢�B
- Floor 10 ���B���̊��҃��x���� Lv8 �O��ŁA2?3���ԃN���A�z��Ƃ��Ă͑Ó��B
- �ŏ���30���̂��J���́u���x���A�b�v�v�u�����X�V�v�u������ʂ̔����v���Œ�1�񂸂ۏ؂���݌v�Ɋ񂹂�B
- �㔼�͒ʏ��������߂ɂ��Ă悢���A�{�X�͑΍�ŉz������ڐ���ێ�����B
- ���l�͏��� 1 ��ۏ؂���������BFloor 2?3 �ŕ⋋�̌����Ȃ��ƌo�ϗv�f�̖��͂������ɂ����B

## Immediate Tooling Use

- Run `node tools/balance-report.js` after changing `LEVEL_TABLE`, `ENEMY_DEFS`, `ITEM_DEFS`, or boss stats.
- Treat this as a coarse balance gate, then verify with playtests.
- Use the early-game section to protect onboarding fun, and the late-game section to tune pressure.

