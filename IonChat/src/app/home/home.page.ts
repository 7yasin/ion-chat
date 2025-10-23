import { Component } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  chats: any[] = [];
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  currentChat: string | null = null;
  currentChatName: string | null = null;

  messages: any[] = [];
  userData: any = {};
  messageText: string = '';
  showUserList: boolean = false;

  sendSound: HTMLAudioElement;

  constructor(
    private afAuth: AngularFireAuth,
    private DatabaseService: DatabaseService,
    private alertController: AlertController,
    private router: Router
  ) {
    this.sendSound = new Audio('../../assets/ses/gonder.mp3');
  }

  async ngOnInit() {
    await this.checkUser();
    this.allUsers = await this.getAllUsers();
  }

  private async checkUser() {
    this.DatabaseService.authCheck().subscribe(async (user) => {
      if (user) {
        const allUsers = await this.getAllUsers();
        const currentUser = allUsers.find((u) => u.userId === user.uid);

        this.userData = {
          uid: user.uid,
          displayName: currentUser?.username || 'User',
        };

        console.log('User data:', this.userData);
        this.getUserChats(user.uid);
      } else {
        this.userData = null;
        this.router.navigate(['/login']);
      }
    });
  }

  async logout() {
    try {
      await this.afAuth.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      this.showAlert('Error', 'Unable to log out. Please try again.');
    }
  }

  private async getAllUsers(): Promise<any[]> {
    try {
      const usersSnapshot = await firstValueFrom(
        this.DatabaseService.getData('users')
      );
      return Object.keys(usersSnapshot).map((key) => ({
        userId: key,
        username: usersSnapshot[key].username,
      }));
    } catch (error) {
      console.error('Error retrieving users:', error);
      return [];
    }
  }

  private async getUserChats(userId: string) {
    this.DatabaseService.getData('chats').subscribe(async (allChats) => {
      const allUsers = await this.getAllUsers();

      this.chats = Object.keys(allChats || {}).reduce(
        (acc: any[], chatId: string) => {
          if (chatId.includes(userId)) {
            const chatData = allChats[chatId];
            const otherUserId = chatId.replace(userId, '').replace('_', '');
            const otherUser = allUsers.find(
              (user) => user.userId === otherUserId
            );

            acc.push({
              id: chatId,
              reverseId: chatId.split('_').reverse().join('_'),
              userName: otherUser ? otherUser.username : 'Unknown User',
              lastMessage: this.getLastMessage(chatData),
              lastMessageDate: this.getLastMessage(chatData, true),
            });
          }
          return acc;
        },
        []
      );

      console.log('User chats:', this.chats);

      if (!this.currentChat && this.chats.length > 0) {
        await this.openChat(this.chats[0].id, this.chats[0].reverseId);
        this.scroll();
      }
    });
  }

  getLastMessage(chatData: any, date?: boolean): string {
    if (!chatData) return 'Start a chat.';

    const keys = Object.keys(chatData).sort();
    const lastKey = keys[keys.length - 1];
    const secondLastKey = keys[keys.length - 2];

    const messageKey = lastKey === 'createdAt' ? secondLastKey : lastKey;

    if (!date) return chatData?.[messageKey]?.message || 'Start a chat.';
    else return chatData?.[messageKey]?.timestamp || null;
  }

  toggleUserList() {
    this.filteredUsers = this.allUsers.filter((user) => {
      if (user.userId === this.userData.uid) {
        return false;
      }

      return !this.chats.some((chat) => {
        const chatParticipants = chat.id.split('_');
        return chatParticipants.includes(user.userId);
      });
    });

    this.showUserList = !this.showUserList;
    console.log(this.filteredUsers);
  }

  async startNewChat(otherUserId: string) {
    const chatId = `${this.userData.uid}_${otherUserId}`;
    const reverseChatId = `${otherUserId}_${this.userData.uid}`;

    try {
      const chats = await firstValueFrom(this.DatabaseService.getData('chats'));

      if (!chats[chatId] && !chats[reverseChatId]) {
        await this.DatabaseService.addData('chats', chatId, {
          createdAt: new Date().toISOString(),
        });
        console.log('New chat created:', chatId);
      } else {
        console.log('Chat already exists:', chatId);
      }

      this.showUserList = false;
      this.openChat(chatId, reverseChatId);
    } catch (error) {
      console.error('Error starting new chat:', error);
    }
  }

  openChat(chatId: string, reverseId: string) {
    this.currentChat = chatId;

    const chat = this.chats.find((chat) => chat.id === chatId);
    this.currentChatName = chat ? chat.userName : 'Unknown User';

    this.DatabaseService.getData(`chats/${chatId}`).subscribe(
      (chatMessages) => {
        this.DatabaseService.getData(`chats/${reverseId}`).subscribe(
          (reverseMessages) => {
            this.messages = [
              ...Object.values(chatMessages || {}),
              ...Object.values(reverseMessages || {}),
            ]
              .filter((message: any) => message?.message && message?.timestamp)
              .sort(
                (a: any, b: any) =>
                  new Date(a.timestamp).getTime() -
                  new Date(b.timestamp).getTime()
              );

            this.scroll();
          }
        );
      }
    );
  }

  async sendMessage() {
    if (!this.messageText.trim() || !this.currentChat) {
      this.showAlert(
        'Warning',
        'Message cannot be empty or no chat is selected.'
      );
      return;
    }

    const receiver = this.currentChat
      .replace(this.userData.uid, '')
      .replace('_', '');
    const date = new Date().toISOString();

    try {
      await this.DatabaseService.sendMessage(
        receiver,
        this.userData.uid,
        date,
        this.messageText
      );
      this.messageText = '';
      this.sendSound.play();
      this.scroll();
    } catch (error) {
      console.error('Error while sending message:', error);
    }
  }

  async showAlert(title: string, text: string): Promise<void> {
    const alert = await this.alertController.create({
      header: title,
      message: text,
      buttons: ['Okey'],
    });
    await alert.present();
  }

  private scroll() {
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  getTime(timestamp: string): string {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
