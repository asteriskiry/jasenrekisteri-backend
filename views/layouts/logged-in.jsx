var React = require('react');

class LoggedInLayout extends React.Component {
    render() {
        return (
            <html>
                <head>
                    <title>{this.props.title}</title>
                    <meta charset="utf-8"></meta>
                    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"></meta>
                    <link rel="icon" href="/img/favicon-32x32.png" sizes="32x32"></link>
                    <link rel="icon" href="/img/favicon-192.png" sizes="192x192"></link>
                    <link rel="apple-touch-icon-precomposed" href="/img/favicon-180x180.png"></link>
                    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous"></link>
                    <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.8.1/css/all.css" integrity="sha384-50oBUHEmvpQ+1lW4y57PTFmhCaXp0ML5d60M1M7uH2+nqUivzIebhndOJK28anvf" crossorigin="anonymous"></link>
                    <link rel='stylesheet' id='asteriski-font-css' href='https://fonts.googleapis.com/css?family=Montserrat:300,400,500|Poppins:400,500,600,700,80' type='text/css' media='all'></link>
                    <link href="/css/style-logged-in.css" rel="stylesheet" type="text/css"></link>
                    <script src="https://code.jquery.com/jquery-3.2.1.slim.min.js" integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN" crossorigin="anonymous"></script>
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js" integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q" crossorigin="anonymous"></script>
                    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js" integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl" crossorigin="anonymous"></script>
                </head>
                <body>
                    <nav className="navbar navbar-expand-lg navbar-light bg-light">
                        <a className="navbar-brand" href="/profile"><img src="/img/asteriski-logo.png"></img> Jäsenrekisteri</a>
                        <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                            <span className="navbar-toggler-icon"></span>
                        </button>

                        <div className="collapse navbar-collapse" id="navbarSupportedContent">
                            <ul className="navbar-nav ml-auto">
                                { this.props.user.admin ?
                                    <li className={`nav-item${this.props.active === 'admin' ? ' active' : ''}`}>
                                        <a className={`nav-link${this.props.active === 'admin' ? '' : ' control'}`} href="/admin">Hallinta</a>
                                    </li>
                                    : '' }
                                <li className={`nav-item${this.props.active === 'profile' ? ' active' : ''}`}>
                                    <a className="nav-link" href="/profile">Tiedot</a>
                                </li>
                                <li className={`nav-item${this.props.active === 'edit-profile' ? ' active' : ''}`}>
                                    <a className="nav-link" href="/edit-profile">Muokkaa tietoja</a>
                                </li>
                                <li className={`nav-item${this.props.active === 'pay-membership' ? ' active' : ''}`}>
                                    <a className="nav-link" href="/pay-membership">Jäsenmaksu</a>
                                </li>
                                <li className="nav-item">
                                    <a className="nav-link" href="/logout">Kirjaudu ulos</a>
                                </li>
                            </ul>
                        </div>
                    </nav>
                    {this.props.children}
                </body>
            </html>
        );
    }
}
module.exports = LoggedInLayout;
