import { createRoom, joinRoom, subscribeToOpenRooms } from '../online/roomService';
import type { RoomSummary, StoneColor, Visibility } from '../online/types';

export interface OnlineScreenOptions {
  onRoomReady: (roomId: string, color: StoneColor) => void;
}

export interface OnlineScreenView {
  element: HTMLElement;
  dispose: () => void;
}

// オンライン対戦のロビー画面（五目並べのonlineScreen.tsと同じ構成）
export function renderOnlineScreen(options: OnlineScreenOptions): OnlineScreenView {
  const wrapper = document.createElement('div');

  const nameSection = document.createElement('section');
  nameSection.className = 'card online-panel';
  const nameLabel = document.createElement('label');
  nameLabel.className = 'online-panel__label';
  nameLabel.textContent = '名前（任意・未入力可）';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'online-panel__input';
  nameInput.placeholder = '未入力の場合は「先手」「後手」と表示されます';
  nameInput.maxLength = 20;
  nameLabel.appendChild(nameInput);
  nameSection.appendChild(nameLabel);
  wrapper.appendChild(nameSection);

  const createSection = document.createElement('section');
  createSection.className = 'card online-panel';
  const createTitle = document.createElement('h3');
  createTitle.className = 'online-panel__title';
  createTitle.textContent = 'ルームを作成する';
  createSection.appendChild(createTitle);

  let creatorColor: StoneColor = 'black';
  let visibility: Visibility = 'public';

  const colorGroup = document.createElement('div');
  colorGroup.className = 'online-panel__group';
  const colorLabel = document.createElement('p');
  colorLabel.className = 'online-panel__group-label';
  colorLabel.textContent = '手番';
  colorGroup.appendChild(colorLabel);

  const colorRow = document.createElement('div');
  colorRow.className = 'online-panel__buttons';

  const blackToggle = document.createElement('button');
  blackToggle.type = 'button';
  blackToggle.className = 'btn btn-primary';
  blackToggle.textContent = '黒番（先手）';
  blackToggle.addEventListener('click', () => setCreatorColor('black'));
  colorRow.appendChild(blackToggle);

  const whiteToggle = document.createElement('button');
  whiteToggle.type = 'button';
  whiteToggle.className = 'btn';
  whiteToggle.textContent = '白番（後手）';
  whiteToggle.addEventListener('click', () => setCreatorColor('white'));
  colorRow.appendChild(whiteToggle);

  colorGroup.appendChild(colorRow);
  createSection.appendChild(colorGroup);

  function setCreatorColor(color: StoneColor): void {
    creatorColor = color;
    blackToggle.classList.toggle('btn-primary', color === 'black');
    whiteToggle.classList.toggle('btn-primary', color === 'white');
  }

  const visibilityGroup = document.createElement('div');
  visibilityGroup.className = 'online-panel__group';
  const visibilityLabel = document.createElement('p');
  visibilityLabel.className = 'online-panel__group-label';
  visibilityLabel.textContent = '公開設定';
  visibilityGroup.appendChild(visibilityLabel);

  const visibilityRow = document.createElement('div');
  visibilityRow.className = 'online-panel__buttons';

  const publicToggle = document.createElement('button');
  publicToggle.type = 'button';
  publicToggle.className = 'btn btn-primary';
  publicToggle.textContent = '公開';
  publicToggle.addEventListener('click', () => setVisibility('public'));
  visibilityRow.appendChild(publicToggle);

  const privateToggle = document.createElement('button');
  privateToggle.type = 'button';
  privateToggle.className = 'btn';
  privateToggle.textContent = '非公開';
  privateToggle.addEventListener('click', () => setVisibility('private'));
  visibilityRow.appendChild(privateToggle);

  visibilityGroup.appendChild(visibilityRow);
  createSection.appendChild(visibilityGroup);

  function setVisibility(v: Visibility): void {
    visibility = v;
    publicToggle.classList.toggle('btn-primary', v === 'public');
    privateToggle.classList.toggle('btn-primary', v === 'private');
  }

  const createRoomButton = document.createElement('button');
  createRoomButton.type = 'button';
  createRoomButton.className = 'btn btn-primary online-panel__create-button';
  createRoomButton.textContent = 'ルームを作成';
  createRoomButton.addEventListener('click', () => handleCreate(visibility));
  createSection.appendChild(createRoomButton);

  const createHint = document.createElement('p');
  createHint.className = 'online-panel__hint';
  createHint.textContent = '非公開ルームは一覧に表示されません。ルーム番号を伝えた相手だけが参加できます。';
  createSection.appendChild(createHint);

  const createError = document.createElement('p');
  createError.className = 'online-panel__error';
  createSection.appendChild(createError);

  wrapper.appendChild(createSection);

  const joinSection = document.createElement('section');
  joinSection.className = 'card online-panel';
  const joinTitle = document.createElement('h3');
  joinTitle.className = 'online-panel__title';
  joinTitle.textContent = 'ルーム番号で参加する';
  joinSection.appendChild(joinTitle);

  const joinRow = document.createElement('div');
  joinRow.className = 'online-panel__buttons';
  const joinInput = document.createElement('input');
  joinInput.type = 'text';
  joinInput.className = 'online-panel__input online-panel__input--code';
  joinInput.placeholder = '例: AB12CD';
  joinInput.maxLength = 6;
  joinRow.appendChild(joinInput);

  const joinButton = document.createElement('button');
  joinButton.type = 'button';
  joinButton.className = 'btn btn-primary';
  joinButton.textContent = '参加する';
  joinButton.addEventListener('click', () => handleJoin(joinInput.value.trim().toUpperCase()));
  joinRow.appendChild(joinButton);

  joinSection.appendChild(joinRow);

  const joinError = document.createElement('p');
  joinError.className = 'online-panel__error';
  joinSection.appendChild(joinError);

  wrapper.appendChild(joinSection);

  const listSection = document.createElement('section');
  listSection.className = 'card online-panel';
  const listTitle = document.createElement('h3');
  listTitle.className = 'online-panel__title';
  listTitle.textContent = '参加できる公開ルーム';
  listSection.appendChild(listTitle);

  const listBody = document.createElement('div');
  listBody.className = 'online-room-list';
  listBody.textContent = '読み込み中…';
  listSection.appendChild(listBody);

  wrapper.appendChild(listSection);

  function setBusy(busy: boolean): void {
    createRoomButton.disabled = busy;
    joinButton.disabled = busy;
  }

  async function handleCreate(visibility: Visibility): Promise<void> {
    createError.textContent = '';
    setBusy(true);
    try {
      const roomId = await createRoom(nameInput.value.trim(), visibility, creatorColor);
      options.onRoomReady(roomId, creatorColor);
    } catch (error) {
      createError.textContent = 'ルームの作成に失敗しました。時間をおいて再度お試しください。';
      console.error(error);
      setBusy(false);
    }
  }

  async function handleJoin(roomId: string): Promise<void> {
    joinError.textContent = '';
    if (!roomId) {
      joinError.textContent = 'ルーム番号を入力してください';
      return;
    }
    setBusy(true);
    try {
      const result = await joinRoom(roomId, nameInput.value.trim());
      if (!result.ok) {
        joinError.textContent = result.reason === 'not-found' ? 'そのルームは見つかりませんでした' : 'このルームは満員です';
        setBusy(false);
        return;
      }
      options.onRoomReady(roomId, result.color);
    } catch (error) {
      joinError.textContent = '参加に失敗しました。時間をおいて再度お試しください。';
      console.error(error);
      setBusy(false);
    }
  }

  function renderRoomList(rooms: RoomSummary[]): void {
    listBody.innerHTML = '';
    if (rooms.length === 0) {
      listBody.textContent = '現在参加できる公開ルームはありません';
      return;
    }
    for (const room of rooms) {
      const item = document.createElement('div');
      item.className = 'online-room-list__item';

      const label = document.createElement('span');
      label.textContent = `${room.hostName}のルーム（${room.roomId}）`;
      item.appendChild(label);

      const enterButton = document.createElement('button');
      enterButton.type = 'button';
      enterButton.className = 'btn btn-primary';
      enterButton.textContent = '参加する';
      enterButton.addEventListener('click', () => handleJoin(room.roomId));
      item.appendChild(enterButton);

      listBody.appendChild(item);
    }
  }

  const unsubscribe = subscribeToOpenRooms(renderRoomList);

  return { element: wrapper, dispose: unsubscribe };
}
