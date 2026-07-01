# 🔄 Como Sincronizar com GitHub

Este guia mostra como enviar suas alterações automaticamente para o GitHub.

## ⚠️ IMPORTANTE: Arquivo .env

O arquivo `.env` contém informações sensíveis (senhas, chaves de API, etc.) e **NÃO deve ser enviado para o GitHub**. Ele já está protegido no `.gitignore`.

## 🚀 Método 1: Script Automático (Recomendado)

Use o script `sync-github.ps1` para sincronizar rapidamente:

```powershell
# Sincronizar com mensagem automática (data/hora)
.\sync-github.ps1

# Sincronizar com sua própria mensagem
.\sync-github.ps1 "Adicionei nova funcionalidade X"
```

### O que o script faz:
1. ✅ Adiciona todas as alterações (exceto arquivos no .gitignore)
2. ✅ Cria um commit com sua mensagem
3. ✅ Envia para o GitHub automaticamente

## 📝 Método 2: Comandos Git Manuais

Se preferir controle total:

```powershell
# 1. Ver o que foi alterado
git status

# 2. Adicionar arquivos específicos
git add arquivo1.js arquivo2.css

# OU adicionar tudo
git add .

# 3. Fazer commit
git commit -m "Descrição das alterações"

# 4. Enviar para GitHub
git push origin main
```

## 🔍 Comandos Úteis

```powershell
# Ver histórico de commits
git log --oneline -10

# Ver diferenças antes de commitar
git diff

# Desfazer alterações em um arquivo
git checkout -- arquivo.js

# Puxar alterações do GitHub
git pull origin main
```

## ❌ Problemas Comuns

### "Permission denied" ou erro de autenticação
- Configure suas credenciais do GitHub
- Considere usar SSH ou Personal Access Token

### "Your branch is behind"
```powershell
git pull origin main
git push origin main
```

### Conflitos de merge
```powershell
# Resolver conflitos manualmente nos arquivos
# Depois:
git add .
git commit -m "Resolvido conflito"
git push origin main
```

## 🎯 Fluxo de Trabalho Recomendado

1. **Faça suas alterações** no código
2. **Teste localmente** para garantir que funciona
3. **Sincronize** usando `.\sync-github.ps1 "descrição"`
4. **Verifique no GitHub** que as alterações foram enviadas

---

💡 **Dica**: Sincronize frequentemente (a cada funcionalidade completa) para não perder trabalho!
