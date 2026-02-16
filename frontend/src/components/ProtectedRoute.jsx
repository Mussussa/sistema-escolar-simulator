// Remova a linha do 'import e from express'
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const userJson = localStorage.getItem("usuario");
  const token = localStorage.getItem("token");

  // Verifica se os dados existem antes de tentar dar o Parse (evita erro de undefined)
  if (!token || !userJson) {
    return <Navigate to="/login" />;
  }

  const user = JSON.parse(userJson);

  // Verifica se o nível de acesso do usuário está na lista permitida
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redireciona para o login ou uma página de erro se não tiver permissão
    return <Navigate to="/login" />; 
  }

  return children;
};

export default ProtectedRoute;