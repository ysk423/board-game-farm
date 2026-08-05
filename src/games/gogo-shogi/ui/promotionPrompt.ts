// 成る/成らないの両方が合法手として存在する場合に選択させるポップアップ。
// CPU対戦・オンライン対戦の両方から使う
export function showPromotionPrompt(onChoice: (promote: boolean) => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const title = document.createElement('h2');
  title.className = 'modal__title';
  title.textContent = '成りますか？';
  modal.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'modal__actions';

  const yesButton = document.createElement('button');
  yesButton.type = 'button';
  yesButton.className = 'btn btn-primary';
  yesButton.textContent = '成る';
  yesButton.addEventListener('click', () => {
    overlay.remove();
    onChoice(true);
  });

  const noButton = document.createElement('button');
  noButton.type = 'button';
  noButton.className = 'btn';
  noButton.textContent = '成らない';
  noButton.addEventListener('click', () => {
    overlay.remove();
    onChoice(false);
  });

  actions.appendChild(yesButton);
  actions.appendChild(noButton);
  modal.appendChild(actions);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
