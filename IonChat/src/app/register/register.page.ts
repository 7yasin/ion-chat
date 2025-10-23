import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import { DatabaseService } from '../services/database.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage {
  constructor(
    private afAuth: AngularFireAuth,
    private DatabaseService: DatabaseService,
    private navCtrl: NavController,
    private http: HttpClient,
    private router: Router,
    private alertController: AlertController
  ) {}

  username: string = '';
  password: string = '';
  emailPattern: RegExp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  email: string = '';

  showAlert = async (title: string, text: string): Promise<void> => {
    const alert = await this.alertController.create({
      header: title,
      message: text,
      buttons: ['Okey'],
    });
    await alert.present();
  };

  ngOnInit() {
    this.DatabaseService.authCheck().subscribe((data) => {
      if (data) {
        //   this.showAlert("Zaten giriş yapılı. 2", "lütfen önce hesabınızdan çıkış yapın.")  HATALI
        this.router.navigate(['/home']);
      }
    });
  }

  async register(username: string, password: string, email: string) {
    try {
      const userInfo = await this.afAuth.createUserWithEmailAndPassword(
        email,
        password
      );

      const userID = userInfo.user?.uid;

      const userData = {
        username: username,
        password: password,
        email: email,
      };
      console.log(userID);
      if (userID) {
        await this.DatabaseService.addData('users', userID, userData);
        this.showAlert(
          'Registration Successful',
          'Welcome! You are being redirected to the home page.'
        );
        this.router.navigate(['/home']);
      }
    } catch (error) {
      console.error('An error occurred during registration:', error);
      this.showAlert(
        'Registration Failed',
        'We are unable to complete your registration at the moment. ' + error
      );
    }
  }

  async onSubmit(form: NgForm) {
    if (form.valid) {
      try {
        await this.register(this.username, this.password, this.email);
      } catch (error) {
        this.showAlert(
          'Registration Error',
          'An error occurred during registration. ' + error
        );
      }
    } else {
      await this.showAlert(
        'Registration Failed',
        'Please make sure all fields are filled out correctly.'
      );
    }
  }
}
