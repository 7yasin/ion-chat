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
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  email: string = '';
  password: string = '';
  user: any = {};
  emailPattern: RegExp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  constructor(
    private afAuth: AngularFireAuth,
    private DatabaseService: DatabaseService,
    private navCtrl: NavController,
    private http: HttpClient,
    private router: Router,
    private alertController: AlertController,
    private storage: Storage
  ) {
    this.initStorage();
  }

  async initStorage() {
    await this.storage.create();
  }

  ngOnInit() {
    this.DatabaseService.authCheck().subscribe((data) => {
      if (data) {
        this.router.navigate(['/home']);
      }
    });
  }

  async showAlert(title: string, text: string): Promise<void> {
    const alert = await this.alertController.create({
      header: title,
      message: text,
      buttons: ['Okey'],
    });
    await alert.present();
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const user = await this.afAuth.signInWithEmailAndPassword(
        email,
        password
      );
      const userID = user.user?.uid;

      if (userID) {
        this.DatabaseService.getData('users/' + userID).subscribe(
          async (data) => {
            if (!data || !data['mail']) {
              this.showAlert('Login Failed', 'User data could not be found.');
            } else {
              this.user = data;
              //await this.storage.('authToken', token); GEREK KALMADI ACMA
              this.showAlert(
                'Login Successful',
                'Welcome ' + data['username'] + '. Redirecting to homepage.'
              );
              this.router.navigate(['/home']);
            }
          }
        );
      }
    } catch (error) {
      console.error('An error occurred during login:', error);
      this.showAlert('Login Failed', 'Incorrect email or password.');
    }
  }

  async onSubmit(form: NgForm): Promise<void> {
    if (form.valid) {
      try {
        await this.login(this.email, this.password);
      } catch (error) {
        console.error('An unexpected error occurred during login:', error);
        this.showAlert('Error', 'Unable to log in at the moment. ' + error);
      }
    } else {
      await this.showAlert(
        'Login Failed',
        'Please fill in all required fields.'
      );
    }
  }
}
