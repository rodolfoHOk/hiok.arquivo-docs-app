import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTable } from '@angular/material/table';
import { Router } from '@angular/router';
import { ClientesService } from 'src/app/clientes.service';
import { Cliente } from 'src/app/clientes/cliente';
import { DocumentosService } from 'src/app/documentos.service';
import { Documento } from '../documento';
import { TipoDocumento } from '../tipos-documentos';

@Component({
  selector: 'app-documentos-list',
  templateUrl: './documentos-list.component.html',
  styleUrls: ['./documentos-list.component.css']
})
export class DocumentosListComponent implements OnInit {

  titulo: string = 'Consulta de Documentos';
  aguardando: boolean = false;
  carregandoClientes: boolean = false;
  carregandoTipos: boolean = true;
  deletando: boolean = false;

  // Formulario consulta
  formGroupConDocs: FormGroup;
  tiposDocumento: TipoDocumento[] = [];
  opcoesCliente: Cliente[] = [];
  opcoesClienteFiltrado: Cliente[] = [];
  documento: Documento = new Documento();

  // Tabela consulta
  @ViewChild('table') table?: MatTable<any>;
  mostrarTabela: boolean = false;
  colunas: string[] = ['id', 'nome', 'tipo', 'cliente',
                       'caixa', 'data', 'observacao', 'acoes'];
  documentos: Documento[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private snackBar : MatSnackBar,
    private clientesService: ClientesService,
    private documentosService: DocumentosService,
    private router: Router,
    public dialog: MatDialog
  ) { 
    this.formGroupConDocs = this.formBuilder.group({
      "nomeCliente": [''],
      "idCliente": [''],
      "caixa": [''],
      "tipo": [''],
      "nome": ['']
    });
  }

  ngOnInit(): void {
    this.buscarTiposDocumento();
  }

  // Formulário Consulta
  onChangeNomeCliente(nomeCliente: string) {
    if(nomeCliente.length >= 3){
      if(nomeCliente.length === 3){
        this.carregandoClientes = true;
        this.clientesService.buscar(nomeCliente)
          .subscribe(
            response => {
              this.opcoesCliente = response;
              this.carregandoClientes = false;
            },
            error => {
              this.snackBar.open('Erro ao tentar buscar clientes!', 'fechar', {
                duration: 2000
              });
              this.carregandoClientes = false;
            }
          );
      }
      this.opcoesClienteFiltrado = this.filtrarCliente(this.opcoesCliente, nomeCliente);
    } else {
        this.opcoesClienteFiltrado = [];
      }
  }

  onClienteSelected(nomeCliente: string){
    const cliente = this.opcoesClienteFiltrado
    .find(cliente => cliente.nome === nomeCliente);
    if(cliente){
      if(cliente.id){
        this.documento.cliente = cliente.id;
        this.formGroupConDocs.controls['idCliente'].setValue(cliente.id);
      }
    } else {
      this.documento.cliente = 0;
      this.formGroupConDocs.controls['idCliente'].setValue('');
    }
  }

  consultar(){
    this.aguardando = true;
    this.mostrarTabela = false;
    const cliente: number = this.formGroupConDocs.value.idCliente;
    const caixa: number = this.formGroupConDocs.value.caixa;
    const tipo: number = this.formGroupConDocs.value.tipo;
    const nome: string = this.formGroupConDocs.value.nome;
    this.documentosService.buscar(cliente, caixa, tipo, nome)
      .subscribe(
        response => {
          this.documentos = response;
          if(this.documentos.length === 0){
            this.snackBar.open('Nenhum resultado encontrado!', 'fechar', {
              duration: 2000
            });
          } else {
            this.mostrarTabela = true;
          }
          this.aguardando = false;
        },
        error => {
          this.snackBar.open('Erro ao tentar consultar documentos!', 'fechar', {
            duration: 2000
          });
          this.aguardando = false;
        }
    );
  }

  limpar(){
    this.formGroupConDocs.get('nomeCliente')?.setValue('');
    this.formGroupConDocs.get('idCliente')?.setValue('');
    this.formGroupConDocs.get('caixa')?.setValue('');
    this.formGroupConDocs.get('tipo')?.setValue('');
    this.formGroupConDocs.get('nome')?.setValue('');
    this.opcoesCliente = [];
    this.opcoesClienteFiltrado = [];
  }

  private buscarTiposDocumento() : void {
    this.carregandoTipos = true;
    this.documentosService.buscarTipos()
      .subscribe(
        response => {
          this.tiposDocumento = response;
          this.carregandoTipos = false;
        },
        error => {
          this.snackBar.open('Erro ao tentar adquidir tipos de documento!', 'fechar', {
            duration: 2000
          });
          this.carregandoTipos = false;
        }
    );
  }
  
  private filtrarCliente(clientes: Cliente[], nomeFiltrar: string): Cliente[] {
    return clientes.filter(cliente =>
      cliente.nome?.toLowerCase().includes(nomeFiltrar.toLowerCase()));
  }

  // Tabela Resultado

  nomeTipo(id: number): string {
    const tipoDocumento = this.tiposDocumento
      .find(tipo => tipo.id === id);
    if(tipoDocumento?.nome){
      return tipoDocumento.nome;
    } else {
      return '';
    }
  }

  buscarNomeCliente(index: number, idCliente: number): void {
    let cliente: Cliente = new Cliente();
    let nome: string = '';
    this.clientesService.buscarPorId(idCliente)
      .subscribe(
        response => { 
          cliente = response;
          if(cliente.nome){
            nome = cliente.nome;
          }
          this.snackBar.open('Nome do cliente é: ' + nome, 'ok', {
            duration: 3000
          });
        },
        error =>{
          this.snackBar.open('Erro ao tentar adquidir o nome do cliente!', 'fechar', {
            duration: 2000
          });
        }
    );
  }

  editar(idDocumento: number){
    this.router.navigate([`/documentos/form/${idDocumento}`]);
  }

  openDeleteDialog(index: number, idDocumento: number): void {
    const dialogRef = this.dialog.open(DocumentosDeleteDialog, {
      width: '',
      height: '',
      panelClass: 'panelDialog',
      data: { index: index, idDocumento: idDocumento }
    });

    dialogRef.afterClosed().subscribe(
      result => {
        if (result === 'deletado') {
          this.documentos.splice(index, 1);
          this.table?.renderRows();
        }
    });
  }
}

// Dialog
@Component({
  selector: 'app-documentos-delete-dialog',
  templateUrl: 'documentos-delete-dialog.html'
})
export class DocumentosDeleteDialog {

  deletando: boolean = false;

  constructor (
    public dialogRef: MatDialogRef<DocumentosListComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private documentosService: DocumentosService,
    private snackBar: MatSnackBar,
  ) {}

  deletar (index: number, idDocumento: number) {
    this.deletando = true;
    this.documentosService.deletar(idDocumento)
      .subscribe(
        response => {
          this.snackBar.open('Documento deletado com sucesso!', 'fechar', {
            duration: 3000
          });
          this.deletando = false;
          this.dialogRef.close('deletado');
        },
        error => {
          this.snackBar.open('Erro ao tentar deletar o documento!', 'fechar', {
            duration: 3000
          });
          this.deletando = false;
          this.dialogRef.close();
        }
      );
  }

  cancelar(){
    this.dialogRef.close();
  }
}

export interface DialogData {
  index: number;
  idDocumento: number;
}
