import { FaGraduationCap, FaUserShield, FaClipboardCheck } from 'react-icons/fa';
import '../styler/home.css';

const instituicoes = [
  {
    index: 0, // Use vírgula aqui
    nome: 'UBUNTU WEB SOLUTIONS', // Use aspas aqui
    imageUrl: '/ubuntu.jpg',
    imageSize: 390 
  },
  {
    index: 1,
    nome: 'Instituto Politécnico de Emprego e Gestão de Negócios - Hinstec',
    imageUrl: '/logo1.jpeg',
    imageSize: 90 
  }
];

const Home = () => (
  
  <div className="container-home">
  <div className='card'>
  <div className='back'>
    <img src={instituicoes[0].imageUrl} alt={instituicoes[0].nome} className="img-ubuntu" />
    
  </div>
  <div className='front'>
    <img src={instituicoes[1].imageUrl} alt={instituicoes[1].nome} />
    <p>{instituicoes[1].nome}</p>
  </div>
</div>

    {/* <div>
      <FaGraduationCap size="10vw" color="#3498db" />
    </div> */}
    {/* <h1>UBUMTU - SIGE</h1> */}
    <h1>Bem-vindo ao Portal Académico <strong>Hinstec</strong></h1>

    <p>
      Sua jornada escolar nunca foi tão simples. Consulte notas, controle pagamentos e acompanhe o seu progresso de forma rápida, segura e totalmente digital.
    </p>

    <div className="hero-cards">
      <div className="hero-card">
        <FaUserShield size={30} />
        <br />
        Segurança
      </div>

      <div className="hero-card">
        <FaClipboardCheck size={30} />
        <br />
        Agilidade
      </div>
    </div>
  </div>
);

export default Home;
