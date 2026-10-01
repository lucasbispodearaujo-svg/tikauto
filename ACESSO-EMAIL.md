# Acesso por e-mail e senha

Administrador autorizado: lucasbispodearaujo@gmail.com.

Entrada por e-mail e senha ativada na página inicial e em /acesso. Cadastro confirmado e login real validado pelo administrador. Os registros existentes apareceram no painel.

A senha é enviada diretamente ao Supabase Auth pela biblioteca oficial. O servidor verifica a identidade e o e-mail autorizado em cada acesso aos dados. Não há cadastro público na aplicação. O endpoint de envio de código foi desativado.

O administrador criou sua senha diretamente no Supabase. Não enviar senha pelo chat.

Cadastro e carregamento dos registros confirmados. Publicação online e teste de saída permanecem pendentes. O acesso antigo sem token Supabase foi desativado no endpoint de dados.

Os registros continuam no banco D1 existente; não houve migração ao Postgres. Nenhuma configuração de SMTP foi alterada.
