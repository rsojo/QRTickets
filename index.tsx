import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import LoginScreen from './components/LoginScreen';
import { FakeApi } from './api';
import type { User } from './types';


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const api = new FakeApi(); // Instantiate the API

const Main = () => {
    const [user, setUser] = useState<User | null>(null);

    const handleLoginSuccess = (loggedInUser: User) => {
        setUser(loggedInUser);
    };

    const handleLogout = () => {
        setUser(null);
    };

    if (!user) {
        return <LoginScreen api={api} onLoginSuccess={handleLoginSuccess} />;
    }

    // Main app fades in after login
    return (
        <div className="animate-fade-in-up">
            <App api={api} user={user} onLogout={handleLogout} />
        </div>
    );
};


root.render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
);