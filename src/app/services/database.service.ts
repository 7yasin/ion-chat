import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  constructor(
    private db: AngularFireDatabase,
    private afAuth: AngularFireAuth
  ) {}

  addData(path: string, key: string, data: any): Promise<void> {
    return this.db.object(`${path}/${key}`).set(data);
  }

  getData(
    path: string,
    filters: Record<string, any> = {}
  ): Observable<{ [key: string]: any }> {
    return this.db
      .list(path)
      .snapshotChanges()
      .pipe(
        map((changes) => {
          const dataObject: { [key: string]: any } = {};

          changes.forEach((c) => {
            const k = c.payload.key;
            const v = c.payload.val();
            if (k) dataObject[k] = v;
          });

          if (Object.keys(filters).length > 0) {
            return Object.keys(dataObject)
              .filter(
                (k) => filters[k] === undefined || dataObject[k] === filters[k]
              )
              .reduce((acc, k) => {
                acc[k] = dataObject[k];
                return acc;
              }, {} as { [key: string]: any });
          }

          return dataObject;
        })
      );
  }

  updateData(path: string, id: string, data: any): Promise<void> {
    return this.db.list(path).update(id, data);
  }

  deleteData(path: string, id: string): Promise<void> {
    return this.db.list(path).remove(id);
  }

  authCheck(): Observable<any | null> {
    return this.afAuth.authState.pipe(
      switchMap((user) => {
        if (user && user.uid) {
          return this.db
            .object<Record<string, any>>(`users/${user.uid}`)
            .valueChanges()
            .pipe(map((userData) => ({ uid: user.uid, ...(userData || {}) })));
        } else {
          return of(null);
        }
      })
    );
  }

  async sendMessage(
    receiverId: string,
    senderId: string,
    timestamp: string,
    message: string
  ): Promise<void> {
    const chatId = `${senderId}_${receiverId}`;
    const reverseChatId = `${receiverId}_${senderId}`;

    try {
      const chatPath = `chats/${chatId}`;
      const reverseChatPath = `chats/${reverseChatId}`;

      const chatExists = await this.db.object(chatPath).query.once('value');
      const reverseChatExists = await this.db
        .object(reverseChatPath)
        .query.once('value');

      let activeChatPath = chatPath;

      if (!chatExists.exists() && reverseChatExists.exists()) {
        activeChatPath = reverseChatPath;
      } else if (!chatExists.exists() && !reverseChatExists.exists()) {
        await this.db.object(chatPath).set({});
      }

      const messageData = {
        message,
        sender: senderId,
        timestamp,
      };

      await this.db.list(activeChatPath).push(messageData);

      await this.db.list('messages').push({
        message,
        sender: senderId,
        receiver: receiverId,
        timestamp,
      });

      console.log('Message sent successfully.');
    } catch (error) {
      console.error('An error occurred while sending the message:', error);
    }
  }
}
