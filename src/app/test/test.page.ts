import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { DatabaseService } from '../services/database.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { NavController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';

@Component({
  selector: 'app-test',
  templateUrl: './test.page.html',
  styleUrls: ['./test.page.scss'],
})
export class TestPage {
  constructor(
    private afAuth: AngularFireAuth,
    private DatabaseService: DatabaseService,
    private navCtrl: NavController,
    private http: HttpClient,
    private router: Router,
    private alertController: AlertController,
    private storage: Storage
  ) {}

  ngOnInit() {
    this.sendMessage();
  }

  async sendMessage() {
    const receiver = 'e6m42aaM9ihehqZUEdRbcuh6vu63';
    const sender = 'nEIFVZkW70dygbt5WK842qDTZAm2';
    const tarih = new Date().toISOString();
    const message = 'ilk textım';

    try {
      await this.DatabaseService.sendMessage(receiver, sender, tarih, message);
      console.log('text başarıyla gönderildi.');
    } catch (error) {
      console.error('text gönderilirken hata oluştu:', error);
    }
  }
}
