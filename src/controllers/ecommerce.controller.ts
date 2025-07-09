import {
  Count,
  CountSchema,
  FilterExcludingWhere,
  repository,
  Where
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  param,
  patch,
  post,
  put,
  requestBody,
  response,
} from '@loopback/rest';
import {Item, Orders, Users} from '../models';
import {
  ItemRepository,
  OrdersRepository,
  UsersRepository,
} from '../repositories';

interface OrderRequest {
  user_id: number;
  item_id: number;
  count: number;
}

interface CartItem {
  item_id: number;
  count: number;
}

interface CartRequest {
  user_id: number;
  items: CartItem[];
}

export class EcommerceController {
  constructor(
    @repository(ItemRepository)
    public itemRepository: ItemRepository,
    @repository(OrdersRepository)
    public ordersRepository: OrdersRepository,
    @repository(UsersRepository)
    public usersRepository: UsersRepository,
  ) {}

  @post('/items')
  @response(200, {
    description: 'Item model instance',
    content: {'application/json': {schema: getModelSchemaRef(Item)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Item, {
            title: 'NewItem',
            exclude: ['id'],
          }),
        },
      },
    })
    item: Omit<Item, 'id'>,
  ): Promise<Item> {
    return this.itemRepository.create(item);
  }

  @post('/users')
  @response(200, {
    description: 'User model instance',
    content: {'application/json': {schema: getModelSchemaRef(Users)}},
  })
  async createUser(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Users, {
            title: 'newUser',
            exclude: ['id'],
          }),
        },
      },
    })
    user: Omit<Users, 'id'>,
  ): Promise<Users> {
    return this.usersRepository.create(user);
  }

  @get('/items/count')
  @response(200, {
    description: 'Item model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(@param.where(Item) where?: Where<Item>): Promise<Count> {
    return this.itemRepository.count(where);
  }

  @get('/items')
  @response(200)
  async findItems(): Promise<Item[]> {
    return this.itemRepository.find();
  }

  @get('/orders')
  @response(200)
  async findOrders(): Promise<Orders[]> {
    return this.ordersRepository.find();
  }

  @get('/users')
  @response(200)
  async findUsers(): Promise<Users[]> {
    return this.usersRepository.find();
  }

  @patch('/items')
  @response(200, {
    description: 'Item PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Item, {partial: true}),
        },
      },
    })
    item: Item,
    @param.where(Item) where?: Where<Item>,
  ): Promise<Count> {
    return this.itemRepository.updateAll(item, where);
  }

  @get('/items/{id}')
  @response(200, {
    description: 'Item model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Item, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.number('id') id: number,
    @param.filter(Item, {exclude: 'where'}) filter?: FilterExcludingWhere<Item>,
  ): Promise<Item> {
    return this.itemRepository.findById(id, filter);
  }

  @patch('/items/{id}')
  @response(204, {
    description: 'Item PATCH success',
  })
  async updateById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Item, {partial: true}),
        },
      },
    })
    item: Item,
  ): Promise<void> {
    await this.itemRepository.updateById(id, item);
  }

  @put('/items/{id}')
  @response(204, {
    description: 'Item PUT success',
  })
  async replaceById(
    @param.path.number('id') id: number,
    @requestBody() item: Item,
  ): Promise<void> {
    await this.itemRepository.replaceById(id, item);
  }

  @del('/items/{id}')
  @response(204, {
    description: 'Item DELETE success',
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    await this.itemRepository.deleteById(id);
  }

  @post('/orders')
  @response(200, {
    description: 'Orders model instance with user and item details',
    content: {'application/json': {
      schema: {
        type: 'object',
        properties: {
          order: {type: 'object'},
          user: {type: 'object'},
          item: {type: 'object'}
        }
      },
      example: {
        order: {
          id: 1,
          user_id: 1,
          item_id: 1,
          stock_number: 2
        },
        user: {
          id: 1,
          username: "burak"
        },
        item: {
          id: 1,
          item_name: "Laptop"
        }
      }
    }},
  })
  async createOrder(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              user_id: {type: 'number'},
              item_id: {type: 'number'},
              count: {type: 'number'}
            }
          },
          example: {
            user_id: 1,
            item_id: 1,
            count: 2
          }
        }
      }
    })
    order: OrderRequest,
  ): Promise<any> {
    // odev
    // item var mı yok mu kontrol ediyoruz
    // user var mı yok mu onu da kontrol edelim
    const item = await this.itemRepository.findById(order.item_id);
    if (!item || item.stock < order.count)
      throw new Error('Item not available or insufficient stock');

    // User kontrolü ekleyelim
    const user = await this.usersRepository.findById(order.user_id);
    if (!user)
      throw new Error('User not found');

    // Update item stock
    item.stock -= order.count;
    await this.itemRepository.updateById(item.id, item);

    const newOrder = {
      user_id: order.user_id,
      item_id: order.item_id,
      stock_number: order.count,
    };

    const createdOrder = await this.ordersRepository.create(newOrder);

    // odev
    // return ederken bana kullanıcı bilgilerini de döndür
    // item bilgilerini de döndür
    return {
      order: createdOrder,
      user: {
        id: user.id,
        username: user.username
      },
      item: {
        id: item.id,
        item_name: item.item_name
      }
    };
  }

  // odev
  // sepete birden fazla ürün eklenebilir
  @post('/cart')
  @response(200, {
    description: 'Multiple orders created from cart',
    content: {'application/json': {
      schema: {
        type: 'object',
        properties: {
          message: {type: 'string'},
          orders: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                order: {type: 'object'},
                user: {type: 'object'},
                item: {type: 'object'}
              }
            }
          }
        }
      },
      example: {
        message: "2 orders created successfully",
        orders: [
          {
            order: {
              id: 1,
              user_id: 1,
              item_id: 2,
              stock_number: 1
            },
            user: {
              id: 1,
              username: "burak"
            },
            item: {
              id: 2,
              item_name: "Mouse"
            }
          },
          {
            order: {
              id: 2,
              user_id: 1,
              item_id: 3,
              stock_number: 4
            },
            user: {
              id: 1,
              username: "burak"
            },
            item: {
              id: 3,
              item_name: "Klavye"
            }
          }
        ]
      }
    }},
  })
  async createCartOrder(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              user_id: {type: 'number'},
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    item_id: {type: 'number'},
                    count: {type: 'number'}
                  }
                }
              }
            },
            example: {
              user_id: 1,
              items: [
                {"item_id": 2, "count": 1},
                {"item_id": 3, "count": 4}
              ]
            }
          }
        }
      }
    })
    cartRequest: CartRequest,
  ): Promise<any> {
    // User kontrolü
    const user = await this.usersRepository.findById(cartRequest.user_id);
    if (!user) {
      throw new Error('User not found');
    }

    const createdOrders = [];

    // Her item için kontrol ve order oluştur
    for (const cartItem of cartRequest.items) {
      const item = await this.itemRepository.findById(cartItem.item_id);
      if (!item) {
        throw new Error(`Item with id ${cartItem.item_id} not found`);
      }

      if (item.stock < cartItem.count) {
        throw new Error(`Insufficient stock for item ${item.item_name}. Available: ${item.stock}, Requested: ${cartItem.count}`);
      }

      // Update item stock
      item.stock -= cartItem.count;
      await this.itemRepository.updateById(item.id, item);

      // Create order
      const newOrder = {
        user_id: cartRequest.user_id,
        item_id: cartItem.item_id,
        stock_number: cartItem.count,
      };

      const createdOrder = await this.ordersRepository.create(newOrder);
      createdOrders.push({
        order: createdOrder,
        user: {
          id: user.id,
          username: user.username
        },
        item: {
          id: item.id,
          item_name: item.item_name
        }
      });
    }

    return {
      message: `${createdOrders.length} orders created successfully`,
      orders: createdOrders
    };
  }

  // odev
  // ürünleri isim, fiyat aralığı veya stok durumuna göre filtreleyip listeleyen endpoint
  @get('/items/filter')
  @response(200, {
    description: 'Filter items by name, price range, or stock',
    content: {'application/json': {
      schema: {
        type: 'array',
        items: {type: 'object'}
      },
      example: [
        {
          id: 1,
          item_name: "Laptop",
          price: 15000,
          stock: 8,
          created_at: "2024-01-01T00:00:00.000Z"
        },
        {
          id: 2,
          item_name: "Mouse",
          price: 150,
          stock: 50,
          created_at: "2024-01-01T00:00:00.000Z"
        }
      ]
    }},
  })
  async filterItems(
    @param.query.string('name') name?: string,
    @param.query.number('minPrice') minPrice?: number,
    @param.query.number('maxPrice') maxPrice?: number,
    @param.query.number('minStock') minStock?: number,
    @param.query.number('maxStock') maxStock?: number,
  ): Promise<Item[]> {
    let items = await this.itemRepository.find();

    if (name) {
      items = items.filter(item =>
        item.item_name.toLowerCase().includes(name.toLowerCase())
      );
    }

    if (minPrice !== undefined) {
      items = items.filter(item => item.price >= minPrice);
    }
    if (maxPrice !== undefined) {
      items = items.filter(item => item.price <= maxPrice);
    }

    if (minStock !== undefined) {
      items = items.filter(item => item.stock >= minStock);
    }
    if (maxStock !== undefined) {
      items = items.filter(item => item.stock <= maxStock);
    }

    return items;
  }
}
