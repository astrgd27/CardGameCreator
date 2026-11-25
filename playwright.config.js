import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./browser-tests',
 timeout:30000,
 retries:0,
 use:{baseURL:'http://127.0.0.1:8000',trace:'retain-on-failure'},
 webServer:{command:'python3 -m http.server 8000 --bind 127.0.0.1',url:'http://127.0.0.1:8000',reuseExistingServer:!process.env.CI},
 projects:[
 {name:'desktop-chromium',use:{browserName:'chromium',viewport:{width:1440,height:900}}},
 {name:'tablet-webkit-landscape',use:{browserName:'webkit',viewport:{width:1024,height:768},hasTouch:true}},
 {name:'tablet-webkit-portrait',use:{browserName:'webkit',viewport:{width:820,height:1180},hasTouch:true}}
 ]
});
